let selectedElement = null;       // 当前锁定元素
let hoveredElement = null;        // 当前悬停元素
let pickerEnabled = false;        // 是否开启选择模式
let pendingCopyText = '';         // 等待在 copy 事件中写入剪贴板的文本

let highlightBox = null;
let pickerButton = null;

// 插件配置
let extensionConfig = {
    includeElementHtml: false,
    showFloatingButton: true
};
// 初始化
init();

function init() {
    console.log('[XPath Picker] init start', {
        href: location.href,
        readyState: document.readyState
    });

    loadConfig().finally(() => {
        console.log('[XPath Picker] init after loadConfig', {
            config: extensionConfig
        });

        initPickerUI();
        bindRuntimeMessage();
        bindKeyboardShortcut();
        bindStorageChange();
        bindNativeCopyInterceptor();

        console.log('[XPath Picker] init done');
    });
}

// ========== 配置 ==========
async function loadConfig() {
    try {
        const result = await chrome.storage.sync.get({
            includeElementHtml: false,
            showFloatingButton: true
        });

        extensionConfig = {
            includeElementHtml: Boolean(result.includeElementHtml),
            showFloatingButton: Boolean(result.showFloatingButton)
        };

        console.log('[XPath Picker] loadConfig success', {
            result,
            extensionConfig
        });
    } catch (err) {
        console.warn('[XPath Picker] 读取插件配置失败，使用默认配置', err);
        extensionConfig = {
            includeElementHtml: false,
            showFloatingButton: true
        };
    }
}

function bindStorageChange() {
    if (!chrome.storage || !chrome.storage.onChanged) {
        console.warn('[XPath Picker] chrome.storage.onChanged 不可用');
        return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
        console.log('[XPath Picker] storage changed', { areaName, changes });

        if (areaName !== 'sync') return;

        if (changes.includeElementHtml) {
            extensionConfig.includeElementHtml = Boolean(changes.includeElementHtml.newValue);

            console.log('[XPath Picker] includeElementHtml updated', {
                includeElementHtml: extensionConfig.includeElementHtml
            });

            showToast(
                extensionConfig.includeElementHtml
                    ? '已开启：复制 XPath 时同时包含元素标签体'
                    : '已关闭：复制 XPath 时不包含元素标签体'
            );
        }

        if (changes.showFloatingButton) {
            extensionConfig.showFloatingButton = Boolean(changes.showFloatingButton.newValue);

            console.log('[XPath Picker] showFloatingButton updated', {
                showFloatingButton: extensionConfig.showFloatingButton
            });

            applyFloatingButtonVisibility();

            showToast(
                extensionConfig.showFloatingButton
                    ? '已显示页面右上角按钮'
                    : '已隐藏页面右上角按钮'
            );
        }
    });
}

// ========== UI ==========
function initPickerUI() {
    // 避免重复注入
    if (document.getElementById('__xpath_picker_btn__')) return;

    // 高亮框
    highlightBox = document.createElement('div');
    highlightBox.id = '__xpath_picker_highlight__';
    Object.assign(highlightBox.style, {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: '2147483647',
        border: '2px solid #ff4d4f',
        background: 'rgba(255, 77, 79, 0.15)',
        display: 'none',
        boxSizing: 'border-box'
    });
    document.documentElement.appendChild(highlightBox);

    // 右上角按钮
    pickerButton = document.createElement('button');
    pickerButton.id = '__xpath_picker_btn__';
    pickerButton.innerText = '选择 XPath';
    Object.assign(pickerButton.style, {
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: '2147483647',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '6px',
        background: '#1677ff',
        color: '#fff',
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        userSelect: 'none'
    });

    pickerButton.addEventListener('click', () => {
        const nextEnabled = !pickerEnabled;

        // 重新进入选择模式时，先清掉旧状态
        if (nextEnabled) {
            clearSelection();
        }

        pickerEnabled = nextEnabled;
        updateButtonState();

        // 主动退出选择时，也清空已选元素
        if (!pickerEnabled) {
            clearSelection();
        }
    });

    document.documentElement.appendChild(pickerButton);

    // 鼠标移动时高亮
    document.addEventListener('mousemove', handleMouseMove, true);

    // 点击锁定元素
    document.addEventListener('click', handleClickSelect, true);

    // ESC 退出
    document.addEventListener('keydown', handleEscapeKey, true);
    // 根据配置控制按钮显示
    applyFloatingButtonVisibility();
}

function updateButtonState() {
    if (!pickerButton) return;

    if (pickerEnabled) {
        pickerButton.innerText = '退出选择';
        pickerButton.style.background = '#52c41a';
    } else {
        pickerButton.innerText = '选择 XPath';
        pickerButton.style.background = '#1677ff';
    }
}

// ========== 事件 ==========
function handleMouseMove(event) {
    if (!pickerEnabled) return;

    const target = event.target;

    if (isExtensionUI(target)) {
        return;
    }

    hoveredElement = target;
    showHighlight(target);
}

function handleClickSelect(event) {
    if (!pickerEnabled) return;

    const target = event.target;

    if (isExtensionUI(target)) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    selectedElement = target;
    hoveredElement = target;
    showHighlight(selectedElement);

    console.log('[XPath Picker] element selected', {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        text: (target.textContent || '').trim().slice(0, 100),
        includeElementHtml: extensionConfig.includeElementHtml
    });

    pickerEnabled = false;
    updateButtonState();

    showToast('元素已选中，可右键菜单复制，或直接按 Ctrl+C / Cmd+C');
}

function handleEscapeKey(event) {
    if (event.key !== 'Escape') return;

    if (pickerEnabled || selectedElement) {
        pickerEnabled = false;
        updateButtonState();
        clearSelection();
        showToast('已退出选择并清空当前元素');
    }
}

function bindKeyboardShortcut() {
    document.addEventListener('keydown', (event) => {
        const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c';

        if (!isCopyShortcut) return;
        if (!selectedElement) return;

        // 避免影响输入框正常复制
        const activeEl = document.activeElement;
        if (isEditableElement(activeEl)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }

        const copyText = buildCopyText(selectedElement);

        forceCopyText(copyText).then(() => {
            clearSelection();
        }).catch((err) => {
            console.error('快捷键复制失败:', err);
            showToast('复制失败，请重试');
        });
    }, true);
}

function bindNativeCopyInterceptor() {
    document.addEventListener('copy', (event) => {
        if (!pendingCopyText) return;

        console.log('[XPath Picker] intercept native copy', {
            pendingCopyText
        });

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }

        if (event.clipboardData) {
            event.clipboardData.setData('text/plain', pendingCopyText);
            event.clipboardData.setData(
                'text/html',
                `<pre style="white-space:pre-wrap;">${escapeHtmlText(pendingCopyText)}</pre>`
            );
        }

        pendingCopyText = '';
    }, true);
}

function applyFloatingButtonVisibility() {
    if (!pickerButton) return;

    if (extensionConfig.showFloatingButton) {
        pickerButton.style.display = 'block';
    } else {
        pickerButton.style.display = 'none';
        pickerEnabled = false;
        updateButtonState();
        clearSelection();
    }
}

// ========== 与 background 通信 ==========
function bindRuntimeMessage() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[XPath Picker] onMessage', {
            request,
            sender,
            selectedElement,
            includeElementHtml: extensionConfig.includeElementHtml
        });

        if (request.action === 'generate_xpath') {
            if (!selectedElement) {
                console.warn('[XPath Picker] generate_xpath failed: no selected element');
                showToast('请先点击右上角“选择 XPath”按钮并选中一个元素');
                sendResponse({ success: false, message: 'no selected element' });
                return;
            }

            const xpath = getQualityXPath(selectedElement);
            const copyText = buildCopyText(selectedElement, xpath);

            console.log('[XPath Picker] generate_xpath prepared', {
                xpath,
                copyText
            });

            forceCopyText(copyText).then(() => {
                console.log('[XPath Picker] generate_xpath copy success');
                clearSelection();
                sendResponse({ success: true, xpath, copiedText: copyText });
            }).catch((err) => {
                console.error('[XPath Picker] generate_xpath copy failed', err);
                sendResponse({ success: false, message: err?.message || 'copy failed' });
            });

            return true;
        }

        if (request.action === 'toggle_picker') {
            if (!extensionConfig.showFloatingButton) {
                sendResponse({
                    success: false,
                    message: 'floating button hidden',
                    pickerEnabled: false
                });
                return;
            }
        
            const nextEnabled = !pickerEnabled;
        
            if (nextEnabled) {
                clearSelection();
            }
        
            pickerEnabled = nextEnabled;
            updateButtonState();
        
            if (!pickerEnabled) {
                clearSelection();
            }
        
            sendResponse({ success: true, pickerEnabled });
        }

        if (request.action === 'get_picker_state') {
            sendResponse({
                success: true,
                pickerEnabled,
                hasSelectedElement: Boolean(selectedElement),
                includeElementHtml: extensionConfig.includeElementHtml,
                showFloatingButton: extensionConfig.showFloatingButton
            });
        }

        if (request.action === 'reload_config') {
            console.log('[XPath Picker] reload_config start');

            loadConfig().then(() => {
                console.log('[XPath Picker] reload_config success', extensionConfig);
                sendResponse({
                    success: true,
                    config: { ...extensionConfig }
                });
            }).catch((err) => {
                console.error('[XPath Picker] reload_config failed', err);
                sendResponse({
                    success: false,
                    message: err?.message || 'reload config failed'
                });
            });
            return true;
        }
    });
}
// ========== 状态 / 工具 ==========
function clearSelection() {
    selectedElement = null;
    hoveredElement = null;
    hideHighlight();
}

function isExtensionUI(target) {
    if (!target) return false;

    return (
        target === pickerButton ||
        target === highlightBox ||
        (pickerButton && pickerButton.contains(target))
    );
}

function isEditableElement(el) {
    if (!el) return false;

    const tagName = el.tagName ? el.tagName.toLowerCase() : '';

    return (
        el.isContentEditable ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
    );
}

// ========== 高亮 ==========
function showHighlight(element) {
    if (!element || !highlightBox) return;

    const rect = element.getBoundingClientRect();

    highlightBox.style.display = 'block';
    highlightBox.style.top = `${window.scrollY + rect.top}px`;
    highlightBox.style.left = `${window.scrollX + rect.left}px`;
    highlightBox.style.width = `${rect.width}px`;
    highlightBox.style.height = `${rect.height}px`;
}

function hideHighlight() {
    if (!highlightBox) return;
    highlightBox.style.display = 'none';
}

// ========== 复制内容构建 ==========
function buildCopyText(element, prebuiltXPath = '') {
    const xpath = prebuiltXPath || getQualityXPath(element);

    if (!extensionConfig.includeElementHtml) {
        return xpath;
    }

    const tagHtml = getElementTagHtml(element);
    return `${xpath}\n${tagHtml}`;
}

function getElementTagHtml(element) {
    if (!element) {
        console.warn('[XPath Picker] getElementTagHtml: element is null');
        return '';
    }

    const tagName = element.tagName.toLowerCase();
    const attrs = Array.from(element.attributes || [])
        .map(attr => `${attr.name}="${escapeHtmlAttribute(attr.value)}"`)
        .join(' ');

    const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
    const text = escapeHtmlText(element.textContent || '');
    const result = `${openTag}${text}</${tagName}>`;

    console.log('[XPath Picker] getElementTagHtml', {
        tagName,
        attrs,
        text,
        result
    });

    return result;
}

function escapeHtmlAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHtmlText(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ========== XPath 生成 ==========
function getQualityXPath(element) {
    let paths = [];
    let current = element;
    let attributeNodesCount = 0;

    while (current && current.nodeType === 1) {
        const tagName = current.nodeName.toLowerCase();

        if (tagName === 'html' || tagName === 'body') break;

        let nodeString = tagName;
        let hasAttribute = false;

        const id = current.getAttribute('id');
        const className = current.getAttribute('class');

        if (isUsableId(id)) {
            nodeString += `[@id="${escapeXPathString(id)}"]`;
            hasAttribute = true;
        } else if (isUsableClassName(className)) {
            const cleanClass = normalizeClassName(className);
            nodeString += `[@class="${escapeXPathString(cleanClass)}"]`;
            hasAttribute = true;
        } else {
            const index = getElementIndex(current);
            nodeString += `[${index}]`;
        }

        paths.unshift(nodeString);

        if (hasAttribute) {
            attributeNodesCount++;
        }

        if (attributeNodesCount >= 3) {
            break;
        }

        current = current.parentNode;
    }

    return paths.length > 0 ? '//' + paths.join('/') : '';
}

function isUsableId(id) {
    if (!id) return false;
    if (/^\d+$/.test(id)) return false;
    if (/^[0-9a-fA-F]{10,}$/.test(id)) return false;
    return true;
}

function isUsableClassName(className) {
    if (!className) return false;

    const cleanClass = normalizeClassName(className);
    if (!cleanClass) return false;

    return true;
}

function normalizeClassName(className) {
    return String(className).trim().replace(/\s+/g, ' ');
}

function getElementIndex(element) {
    let index = 1;
    let sibling = element.previousElementSibling;

    while (sibling) {
        if (sibling.tagName === element.tagName) {
            index++;
        }
        sibling = sibling.previousElementSibling;
    }

    return index;
}

function escapeXPathString(str) {
    return String(str).replace(/"/g, '\\"');
}

// ========== 复制 ==========
async function copyToClipboard(text) {
    console.log('[XPath Picker] copyToClipboard start', {
        text,
        length: text.length
    });

    try {
        await navigator.clipboard.writeText(text);
        console.log('[XPath Picker] navigator.clipboard.writeText success');
        showCopiedToast(text);
        return true;
    } catch (err) {
        console.warn('[XPath Picker] navigator.clipboard.writeText failed, fallback to execCommand', err);

        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            Object.assign(textArea.style, {
                position: 'fixed',
                top: '-9999px',
                left: '-9999px',
                opacity: '0'
            });

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const success = document.execCommand('copy');
            document.body.removeChild(textArea);

            console.log('[XPath Picker] execCommand result', { success });

            if (!success) {
                throw new Error('execCommand copy failed');
            }

            showCopiedToast(text);
            return true;
        } catch (fallbackErr) {
            console.error('[XPath Picker] copyToClipboard failed', fallbackErr);
            showToast('复制失败，请重试');
            throw fallbackErr;
        }
    }
}

async function forceCopyText(text) {
    pendingCopyText = text;

    const success = document.execCommand('copy');
    if (!success) {
        pendingCopyText = '';
        throw new Error('execCommand copy failed');
    }

    showCopiedToast(text);
    return true;
}

function showCopiedToast(text) {
    const shortText = text.length > 120 ? `${text.slice(0, 120)}...` : text;
    showToast(`已复制:\n${shortText}`);
}

// ========== 提示 ==========
function showToast(message) {
    const toast = document.createElement('div');
    toast.innerText = message;

    Object.assign(toast.style, {
        position: 'fixed',
        top: '60px',
        right: '16px',
        zIndex: '2147483647',
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: '6px',
        fontSize: '13px',
        lineHeight: '1.5',
        maxWidth: '420px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        boxShadow: '0 2px 8px rgba(0,0,0,.25)'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2200);
}