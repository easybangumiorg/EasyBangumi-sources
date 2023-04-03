# EasyBangumi-sources

纯纯看番源管理仓库，用于存储和分发纯纯看番4.x及更高版本的源文件。

## Statement

本仓库内容均来自互联网投稿，为了代码安全性只收录提交到纯纯看番官方的代码，并由官方编译。

如果使用其他的源，用户需要自己甄别插件安全性，纯纯看番官方无法保证这些插件是否安全。

如果本仓库内容您认为侵犯了你的权益，请提交[issue](https://github.com/easybangumiorg/EasyBangumi-sources/issues/new)联系我们删除。

## Scheme

```json
// index.json
[
    {
        "name": "",
        "pkg": "",
        "icon": "",
        "apk": "",
        "version": "",
        "nsfw": 0,
        "flag": "",
        "targetAPI": 1,
        "sources": [
            {
                "name": "",
                "baseURL": "",
                "hasCloudflare": 1
            }
        ]
    },
    {
        "name": "樱花动漫P",
        "pkg": "com.heyanle.easybangumi_extension",
        "icon": "yhdm.png",
        "apk": "easybangumi-yhdmp-v1.0.apk",
        "version": "1.0",
        "nsfw": 0,
        "flag": "P U",
        "targetAPI": 1,
        "sources": [
            {
                "name": "樱花动漫P",
                "baseURL": "https://m.yhdmp.com/",
                "hasCloudflare": 0
            }
        ]
    }
]
```
