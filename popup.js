const includeElementHtmlEl = document.getElementById('includeElementHtml');
const showFloatingButtonEl = document.getElementById('showFloatingButton');
const togglePickerBtn = document.getElementById('togglePickerBtn');
const statusTextEl = document.getElementById('statusText');

init();

async function init() {
    await loadSettings();
    await refreshPickerState();

    includeElementHtmlEl.addEventListener('change', handleIncludeHtmlChange);
    showFloatingButtonEl.addEventListener('change', handleShowFloatingButtonChange);
    togglePickerBtn.addEventListener('click', handleTogglePicker);
}

async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get({
            includeElementHtml: false,
            showFloatingButton: true
        });

        includeElementHtmlEl.checked = Boolean(result.includeElementHtml);
        showFloatingButtonEl.checked = Boolean(result.showFloatingButton);
    } catch (err) {
        setStatus('读取配置失败');
        console.error('[XPath Picker popup] loadSettings failed', err);
    }
}

async function handleIncludeHtmlChange() {
    try {
        const checked = includeElementHtmlEl.checked;

        await chrome.storage.sync.set({
            includeElementHtml: checked
        });

        setStatus(checked ? '已开启：复制时包含标签体' : '已关闭：复制时不包含标签体');

        await notifyCurrentTabSafe({ action: 'reload_config' });
    } catch (err) {
        setStatus('保存配置失败');
        console.error('[XPath Picker popup] handleIncludeHtmlChange failed', err);
    }
}

async function handleShowFloatingButtonChange() {
    try {
        const checked = showFloatingButtonEl.checked;

        await chrome.storage.sync.set({
            showFloatingButton: checked
        });

        setStatus(checked ? '已显示页面右上角按钮' : '已隐藏页面右上角按钮');

        await notifyCurrentTabSafe({ action: 'reload_config' });
    } catch (err) {
        setStatus('保存显示状态失败');
        console.error('[XPath Picker popup] handleShowFloatingButtonChange failed', err);
    }
}

async function handleTogglePicker() {
    try {
        const response = await notifyCurrentTab({ action: 'toggle_picker' });

        if (!response?.success) {
            setStatus('当前页面无法切换选择模式');
            return;
        }

        setStatus(response.pickerEnabled ? '已开启页面选择模式' : '已关闭页面选择模式');
    } catch (err) {
        setStatus(`当前页面不可用: ${err?.message || 'unknown error'}`);
        console.error('[XPath Picker popup] handleTogglePicker failed', err);
    }
}

async function refreshPickerState() {
    try {
        const response = await notifyCurrentTab({ action: 'get_picker_state' });

        if (response?.success) {
            const lines = [];

            lines.push(response.pickerEnabled ? '当前：选择模式已开启' : '当前：选择模式已关闭');

            if (typeof response.showFloatingButton === 'boolean') {
                lines.push(response.showFloatingButton ? '悬浮按钮：显示中' : '悬浮按钮：已隐藏');
            }

            setStatus(lines.join('\n'));
        } else {
            setStatus('未获取到页面状态');
        }
    } catch (err) {
        setStatus(`当前页面暂不支持: ${err?.message || 'unknown error'}`);
        console.error('[XPath Picker popup] refreshPickerState failed', err);
    }
}

async function notifyCurrentTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    console.log('[XPath Picker popup] current tab', tab);
    console.log('[XPath Picker popup] send message', message);

    if (!tab?.id) {
        throw new Error('No active tab found');
    }

    try {
        const response = await chrome.tabs.sendMessage(tab.id, message);
        console.log('[XPath Picker popup] response', response);
        return response;
    } catch (err) {
        console.error('[XPath Picker popup] sendMessage failed', {
            err,
            message,
            tab
        });
        throw err;
    }
}

async function notifyCurrentTabSafe(message) {
    try {
        return await notifyCurrentTab(message);
    } catch (err) {
        console.warn('[XPath Picker popup] notifyCurrentTabSafe ignored', err);
        return null;
    }
}

function setStatus(text) {
    statusTextEl.textContent = text || '';
}