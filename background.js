chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'copy_xpath',
            title: '复制元素 XPath',
            contexts: ['all']
        });

        chrome.contextMenus.create({
            id: 'toggle_picker',
            title: '开启/关闭 XPath 元素选择',
            contexts: ['all']
        });
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;

    if (info.menuItemId === 'copy_xpath') {
        chrome.tabs.sendMessage(tab.id, { action: 'generate_xpath' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('copy_xpath sendMessage error:', chrome.runtime.lastError.message);
                return;
            }
            console.log('copy_xpath response:', response);
        });
        return;
    }

    if (info.menuItemId === 'toggle_picker') {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle_picker' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('toggle_picker sendMessage error:', chrome.runtime.lastError.message);
                return;
            }
            console.log('toggle_picker response:', response);
        });
    }
});