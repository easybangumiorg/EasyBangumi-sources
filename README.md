# EasyBangumi-sources

纯纯看番源管理仓库，用于存储和分发纯纯看番4.x及更高版本的源文件。

## Statement

本仓库内容均来自互联网投稿，为了代码安全性只收录提交到纯纯看番官方的代码，并由官方编译。

如果使用其他的源，用户需要自己甄别插件安全性，纯纯看番官方无法保证这些插件是否安全。

如果本仓库内容您认为侵犯了你的权益，请提交[issue](https://github.com/easybangumiorg/EasyBangumi-sources/issues/new)联系我们删除。

## Scheme

如果需要投稿插件，请先将 apk 发布在 release 中并在 extension.json 中添加自己的插件仓库的 release 界面：

```json
{
    "plugins": [
        "插件仓库 A",
        "你的插件仓库 release 地址"
    ]
}
```

然后发起 mr，通过后 github action 将会自动解析并更新到官方插件市场中。  

