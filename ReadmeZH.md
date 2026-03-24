# XPath Picker（中文说明）

这是一个用于 Edge / Chrome 的 XPath 复制插件。  
你可以在页面中选择元素，然后通过右键菜单或快捷键 `Ctrl + C` 复制 XPath。
> 基于 Vibe Coding 实现，因此不建议使用。
> 另外，其实它并不智能，只是名称叫做“smart”。

## 主要功能

- 选择页面元素后复制 XPath
- 支持两种复制方式：
  - 右键菜单复制
  - 快捷键 `Ctrl + C` 复制
- 支持可选的“复制 XPath 时附带元素内容（HTML）”功能

## 与浏览器默认复制的区别

本插件在生成 XPath 时，会向上查找最多 3 层带 `id` 或 `class` 的父级节点进行组合。  
这样生成速度快、表达简洁，但不保证绝对唯一，可能匹配多个元素。

## 已知问题

- “复制元素本身（HTML）”功能存在已知 bug。  
  由于使用频率较低，当前版本暂未修复，建议优先使用纯 XPath 复制。

## 推荐搭配

建议配合浏览器插件 **xpath selector** 使用：  
ID：`gffppcedbfdmbminpdameaajcbfaajdk`

## 安装方式（开发者模式）

1. 打开浏览器扩展管理页面（Edge/Chrome）。
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，导入本项目文件夹。
4. 安装后在“来自其他源”中会出现扩展：`XPath Picker`。

---

English README: see `README.md`
