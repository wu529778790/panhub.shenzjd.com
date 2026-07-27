# 网盘公开搜索源审计

更新时间：2026-07-23

## 结论

本轮从 Google、Bing、百度、搜狗、360 搜索及公开汇总文章交叉发现约 116 个候选站，对其中 102 个完成了可访问性、robots、Sitemap、公开详情页、前端请求方式、登录墙和重复库初筛。第二轮又执行 72 次四引擎交叉检索和 87 次 Bing 长尾分页检索，得到 148 个差集域名；剔除百科、软件下载站、官方云盘、内容农场和导航页后，对 29 个新候选站及 PanSou 34 个未启用通用插件继续实测。

真正能增加独立覆盖、且不需要绕过登录、验证码、积分、付费或加密访问控制的来源很少。当前 D1 定时接入 11 个增量源和 20 个公开静态资料库，另有 2 个按需公开搜索接口。增量 Sitemap 与 API 的公开详情索引规模超过 200 万条；对大库、高延迟库和历史失效率较高的库只同步最新有效窗口，不做低质量全量回填。小云滚动源每次约 1000 条，按 10 分钟周期滚动去重并保留 30 天。

## 接入标准

- 页面或数据必须对普通访客公开，且 robots 未禁止对应路径。
- 只读取公开 JSON、Sitemap 和公开详情页，不调用 robots 明确禁止的 API。
- 不解密跳转、不破解验证码、不复用他站账号、不绕过登录、积分或付费墙。
- 分享地址必须能映射到受支持的网盘域名，并经过统一 URL 归一化、去重和失效检测。
- 同库白标、导航站、发布页、默认建站页和只有少量广告链接的站不计为独立来源。
- 大型 Sitemap 使用低并发游标回填，最新页优先，避免单次 Worker 抓全站。

## 已接入来源

| 编号 | 公开来源 | 类型与规模 | 网盘覆盖 | 同步方式 |
| --- | --- | --- | --- | --- |
| rolling-01 | `yunso.net/api/opendata.php` | 每次约 1000 条滚动 JSON | 夸克为主、少量百度 | 每 10 分钟；URL 去重；30 天保留 |
| rolling-02 | `dapanso.com/sitemap.xml` | 约 20 个最新公开详情页 | 百度、夸克、115、迅雷、UC | 每次刷新公开详情页 |
| rolling-03 | `dagehao889.cn/sitemap.xml` | 9479 个详情页 | 百度 | 最新 24 页 + 每轮回填 72 页 |
| rolling-04 | `haitunsou.com/sitemap.xml` | 2083 个详情页 | 夸克 | 最新 24 页 + 每轮回填 72 页 |
| rolling-05 | `xiaojiwo.top/sitemap.xml` | 2795 个详情页 | 夸克等 | 并发 2；最新 12 页 + 每轮回填 24 页 |
| rolling-06 | `zlxapp.top/sitemap.xml` | 约 1 万个详情页 | 百度、夸克、UC 等 | 白名单重写错误旧 IP；最新 18 页 + 回填 48 页 |
| rolling-08 | `pan.xiaozi.cc/sitemap.xml` | 82,876 个详情页 | 夸克 | 最新子 Sitemap 优先；每页只取主资源；回填 48 页 |
| rolling-09 | `zhuiju.us/sitemap.xml` | 约 16.9 万个详情页 | 百度、迅雷、UC | 最新 40 页；读取公开失效标记；不回填高失效历史页 |
| rolling-10 | `kuakeku.com/sitemap.xml` | 9,083 个公开详情页 | 百度、夸克 | 每小时最新 24 页 + 回填 48 页；白名单重写 Sitemap 旧 IP |
| rolling-11 | `esoua.com/static/sitemap/sitemap-index.xml` | 约 153.8 万个公开详情页 | 百度、阿里等 | 每小时只取最新子表末尾 30 页；不回填超大历史库 |
| rolling-12 | `pan.l9.lc/api/resources` | 约 21.97 万条有效公开资源 | 百度、阿里、夸克、天翼、迅雷、123、115、UC | 每小时最新 2 页 + 游标回填 3 页；每轮最多约 500 条 |

静态资料库继续覆盖书籍、课程、软件、动画、影视、磁力以及 115 合集。其中：

- `acoooder/aliyunpanshare` 约 30,707 个去重分享：夸克 28,872、百度 973、阿里 862；“今日新增”和“今日更新”采用只追加同步，历史目录仅首次回填。
- `mswnlz/chinese-traditional`、`mswnlz/healthy`、`mswnlz/self-media` 补充约 122 个中医、健康健身与自媒体运营主题分享，继续沿用按提交增量刷新的轻量同步。
- `dytt123/dytt123.github.io` 的 12,404 条中有 12,282 条与上库重复，仅 122 条增量，因此不再重复接入。
- `har01d5/tvbox` 的公开 115 清单约 638 条，已覆盖本轮找到的 39 条、63 条和 104 条小型重复清单的大部分内容。

对 `maishaninc/limitless-search`、`xianer235/115-media-hub` 与 `wangsy1007/MediaSync115` 汇总的 Telegram 频道做差集检查，并验证公开频道页是否直接给出分享地址。第一轮新增 `newproductsourcing`、`xx123pan`、`TG654TG`；第二轮从 51 个新候选中增加 `CBduanju`、`dianying4k`、`kkdj001`、`qixingzhenren`、`wp123zy`、`yunpanNB`、`yunpanquark`、`zdqxm`。这些频道最近公开页可直接识别 4–48 条网盘链接，且全部放在普通频道批次；普通频道仍为 4 批，默认搜索总量继续保持 8 个 Worker 请求。`Lsp115`、`oneonefivewpfx` 等频道虽然活跃，但资源实际藏在 Telegraph 或第三方会员站的二次跳转中，无法直接得到分享地址，因此不接入。

对 `fish2018/pansou` 2026-06-14 版本的新增插件再次实测，补充启用 `dyyjpro`、`gaoqing888`、`duoduo` 和 `xiaozhang`：前两者分别补充公开详情页里的多网盘链接与中文影视磁力；后两者搜索约 0.4–2.4 秒，在“三体、流浪地球、凡人修仙传、黑镜”四组样本中，每组相对现有插件新增 9–17 条夸克、迅雷、UC、阿里或百度链接。`clxiong` 的磁力样本被现有来源完全覆盖；`kkmao`、`qupansou`、`panta` 等样本为空，`xinjuc` 接近超时，`u3c3` 出现明显无关磁力，均不进入默认并发。`dyyj`、`feikuai`、`alupan` 当前返回 403，`qingying` 返回 502，`ypfxw`/`daishudj` 连接不稳定，`mikuclub` 下载区要求登录，也继续淘汰。

从公开油猴脚本进一步定位到 `feapi.xyz/api/sing.php` 的“脚本开放接口”。接口无需登录，单次返回最多 50 条直链，四组样本响应约 0.77–1.92 秒；“三体”样本相对现有实时插件 25/25 为新增，并包含 115、123、天翼、阿里、UC、百度、迅雷和夸克。已实现为按需的“开放资源索引”插件，所有返回仍经过支持域名、规范化 URL、精确标题匹配和统一去重，避免把接口中的普通网页或宽泛命中带入结果。

从维护活跃的 `OzoO0/cloud-auto-save-x` 继续追踪到 `pansearch.123cf.top/task_suggestions`。接口无需登录或 Token，五组关键词得到 42 个去重分享地址，生产 D1 精确比对为 42/42 未收录；分布为夸克 20、百度 7、阿里 3、迅雷 4、123 网盘 3、115 网盘 2、UC 1，以及 2 条 PikPak 包装的磁力。抽样响应约 0.11–0.40 秒。现已接为“网络资源索引”，单请求预算 1.6 秒、最多 20 条，忽略不可靠的上游类型字段，按真实域名分类，并从 PikPak 链接同时提取内嵌磁力。

`ctwj/urldb` 本身只是可自建的资源数据库软件，不直接提供内容；其公开实例 `pan.l9.lc` 则是独立数据源。实测 `/api/resources?is_valid=true` 约有 219,737 条，接口响应约 0.26–0.42 秒，覆盖八类网盘。为避免抓取约 15.5 万个 Sitemap 详情页，生产同步只请求公开分页 API 的最新窗口和历史游标页，不把该站放入用户实时链路。

第二轮站点差集里，`kuakeku.com` 最新 40 页得到 52 个链接，相对生产 D1 新增 48 个，独立率 92.3%；自动核验为 26 个可直接访问、24 个需要提取码、2 个失效，页面 P50 约 0.47 秒。`esoua.com` 最新 40 页得到 40 个生产库未收录的百度链接，均进入公开提取码页面，详情页 P50 约 2.22 秒。两者均只读取 robots 允许的公开 Sitemap 与详情页，并按每小时一次限频，避免拖慢 10 分钟增量任务。

`qitabbs.com` 最新 40 页虽然得到 43 个独立夸克链接，但自动核验有 8 个失效，且单页约 224 KB、P50 约 1.25 秒，因此保留观察；`xiaokupan.com` 的公开搜索页可覆盖多网盘，但抽样页面经常需要 5–15 秒，不能满足默认搜索时延预算；`zreso.cn` 明确禁止 `/search`、`/acquire` 和 `/api/`，详情页又不直接给分享地址，因此不接。对 PanSou 余下 34 个非成人通用插件分两批使用“三体、凡人修仙传、Python、考研、百年孤独”实测，12 秒窗口内均没有返回可用结果，不再增加默认并发。

## 逐站审计

状态说明：`接入` 表示已进入 D1 同步；`保留观察` 表示公开但暂不适合自动抓取；`不接` 表示不能形成合规、稳定、独立的增量。

| 域名 | 状态 | 判定 |
| --- | --- | --- |
| `yunso.net` | 接入 | 公开滚动 JSON，更新快，可直接解析分享地址 |
| `dapanso.com` | 接入 | robots 允许公开页面，Sitemap 详情直接显示多网盘链接 |
| `dagehao889.cn` | 接入 | 9479 个公开详情页，直接显示百度链接 |
| `haitunsou.com` | 接入 | 2083 个公开详情页，直接显示夸克链接 |
| `xiaojiwo.top` | 接入 | 2795 个公开详情页，直链可见；站点限速明显，已降为并发 2 |
| `zlxapp.top` | 接入 | 详情 JSON 公开百度、夸克、UC；Sitemap 旧 IP 仅按白名单重写同一路径 |
| `fuxipan.com` | 保留观察 | 本地可读 279 个子 Sitemap，但 Cloudflare 出口对子表只得到 26 字节空响应；已停止定时同步，避免无效请求 |
| `pan.xiaozi.cc` | 接入 | robots 明确允许公开页面，82,876 个详情页，SSR 数据公开主资源链接 |
| `zhuiju.us` | 接入 | robots 明确允许 `/d/*.html`，最新 40 页抽样全部有效且相对现库 40/40 为新增；旧页失效率高，因此只同步最新窗口 |
| `kuakeku.com` | 接入 | robots 允许详情页，9,083 页；最新样本独立率 92.3%、有效/需密码率 96.2%，响应快 |
| `esoua.com` | 接入 | robots 允许公开详情，约 153.8 万页；最新 40/40 为生产库新增，只取每小时最新窗口 |
| `kkso.net` | 保留观察 | 约 59.4 万个公开详情页，但最新 40 页均已标失效、跨历史抽样约一半失效；暂不消耗生产回填预算 |
| `qitabbs.com` | 保留观察 | 公开圈子 Sitemap 至少 1.8 万页，但最新链接失效率约 18.6%，页面体积和抓取成本偏高 |
| `xiaokupan.com` | 保留观察 | 公开搜索页含多网盘直链，但抽样 P50 约 5.6 秒并多次达到 15 秒超时，不进入默认链路 |
| `zreso.cn` | 不接 | robots 禁止搜索、取链与 API；允许访问的详情页只提供元数据，不公开分享地址 |
| `wpss.app` / `pansou.app` | 不接 | PanSou 前端实例/同源部署，不形成独立上游；真实插件已在自有容器审计 |
| `panso567.com` / `panso678.com` | 不接 | 同构聚合前端，无公开资源 Sitemap，不能证明独立数据覆盖 |
| `daoso.cn` / `sosop.cn` | 不接 | 同构搜索前端，仅暴露会话接口且无资源 Sitemap，不作为稳定上游 |
| `feapi.xyz` | 接入 | 明确标注的公开脚本搜索接口，0.77–1.92 秒，补充八类网盘并直接返回 115 链接；按需查询，不做定时空抓取 |
| `pansearch.123cf.top` | 接入 | 公开查询 API，五组样本 42/42 为生产库新增，0.11–0.40 秒；补充 115、123、UC、PikPak 与磁力 |
| `pan.l9.lc` | 接入 | 公开分页 API 约 21.97 万条有效资源、覆盖八类网盘；每小时抓 5 页并在 D1 去重 |
| `ctwj/urldb` | 不接软件本体 | 通用资源库程序，不自带互联网资源；只接入其有独立公开数据的在线实例 |
| `a55ure/115ShareHub` | 不接 | 用户手动添加 115 分享后的本地管理与全文检索工具，不是公开互联网资源源 |
| `xianer235/115-media-hub` | 只采用频道线索 | 115 自动化工具，本身不是资源库；其频道清单用于公开频道差集审计 |
| `wangsy1007/MediaSync115` | 只采用频道线索 | 搜索主要复用 PanSou，本身不构成独立库；只采用其公开频道配置做差集 |
| `gogopanso.com:3642` | 保留观察 | 公开 API 本地可用，但 Cloudflare Worker 对非标准端口返回 `Network connection lost`；改用其公开 GitHub 静态库 |
| `gimy115.top` | 不接 | 搜索页公开，但详情和 115 地址需要会员/Cookie，不绕过访问控制 |
| `apachecn/acgn-archive-redir` | 保留观察 | 有 238 个独立 115 链接，但数据停留在 2023 年且仓库工作集约 160 MB，当前失效与同步成本偏高 |
| `lzpanx.com` | 保留观察 | 约 222 个资源 Sitemap、单表约 3000 页且详情公开，但 robots 要求 `Crawl-delay: 20`；当前 Worker 周期不适合合规全量回填 |
| `wnsearch.top` | 不接 | Sitemap 公开详情元数据，但详情不公开分享地址，robots 禁止 `/api/` |
| `xuebapan.com` | 不接 | 约 9597 个关键词索引页；最终地址使用加密跳转，不进行解密 |
| `haisou.cc` | 不接 | 搜索与取链接消耗积分，开放 API 为付费服务 |
| `pandashi8.com` | 不接 | 与夸夸搜、盘了个盘、UP云搜同库白标，取链接受登录控制 |
| `kuakuaso.com` | 不接 | 同库白标，未增加独立覆盖 |
| `panlegepan.com` | 不接 | 同库白标，未增加独立覆盖 |
| `upyunso.com` | 不接 | 同库白标，未增加独立覆盖 |
| `duanjuso.cc` | 不接 | 通用聚合程序，包含验证码、登录及结果混淆模块 |
| `v4.jujuso.com` | 不接 | 同类聚合程序，robots 除首页外全部禁止 |
| `hunhepan.com` | 不接 | 同类聚合程序，账号/API 功能明显，robots 要求高延迟 |
| `codelicence.cn` | 不接 | 搜索脚本、请求参数与结果均混淆/加密，不绕过 |
| `gugeso.com` | 不接 | SSE 加密聚合程序，结果 URL 加密或带验证码 |
| `zhuyunso.top` | 不接 | SSE 加密聚合程序，结果 URL 加密或带验证码 |
| `pan.funletu.com` | 不接 | 当前为默认建站页 |
| `xykmovie.com` | 不接 | 首页只有少量迅雷置顶/广告直链，无稳定 Sitemap 或完整公开索引 |
| `pan.qianfan.app` | 不接 | 旧式搜索前端，Sitemap 只有首页，未发现稳定公开数据集 |
| `pikasoo.top` | 不接 | 旧式搜索前端，Sitemap 只有首页，未发现稳定公开数据集 |
| `fengba.net` | 不接 | 资源区引导登录，公开 Sitemap 只有站点结构页 |
| `rufengso.com` | 不接 | Sitemap 指向导航子域，公开页面未提供独立资源索引 |
| `chaonengsou.com` | 不接 | 可访问但没有公开 Sitemap/稳定数据接口 |
| `cuppaso.com` | 不接 | 可访问但没有公开 Sitemap/稳定数据接口 |
| `dalipan.com` | 不接 | 页面可访问，未发现可持续的公开详情索引 |
| `daysou.com` | 不接 | `/sitemap.xml` 返回首页 HTML，不是资源 Sitemap |
| `duanjuso.uk` | 不接 | 仅为短剧搜地址发布页 |
| `ed3000.com` | 不接 | 资源 Sitemap 不可用；磁力覆盖已由现有独立源承担 |
| `feizhupan.com` | 不接 | 仅有轻量入口页，无公开资源索引 |
| `panso.pro` | 不接 | 跳转其他域名，robots/Sitemap 返回页面而非资源索引 |
| `panyq.com` | 不接 | 轻量入口页，无公开资源索引 |
| `quark.so` | 不接 | 搜索页可访问，但无公开 Sitemap 或稳定公开详情源 |
| `so.252035.xyz` | 不接 | 仅有极小入口页，不构成独立数据源 |
| `sofuye.com` | 不接 | 返回极小占位内容，无资源索引 |
| `soupan.info` | 不接 | 返回极小入口内容，无资源索引 |
| `woxiangsou.com` | 不接 | 返回极小入口内容，无资源索引 |
| `xiaomapan.com` | 不接 | 搜索入口，无公开 Sitemap |
| `xiaomapan.xyz` | 不接 | 与 `.com` 内容相同，无公开 Sitemap |
| `xiaotusoso.com` | 不接 | Sitemap 为少量 Wiki 文章，不是网盘结果库 |
| `xuesousou.net` | 不接 | 跳转素材站，Sitemap 返回页面 HTML |
| `yun1sou.com` | 不接 | 搜索入口，无公开 Sitemap |
| `yunpangou.com` | 不接 | HTTPS 不稳定，HTTP 仅返回入口页面，Sitemap 无资源列表 |
| `aipanso.com` | 不接 | Cloudflare 访问挑战，未获得公开可持续数据入口 |
| `alipansou.com` | 不接 | Cloudflare 访问挑战，相关子品牌统一跳转到此站 |
| `fastsoso.cc` | 不接 | 访问挑战，未获得公开可持续数据入口 |
| `miaosou.fun` | 不接 | 访问挑战，未获得公开可持续数据入口 |
| `pan666.net` | 不接 | 访问挑战，未获得公开可持续数据入口 |
| `panku8.com` | 不接 | 访问挑战，未获得公开可持续数据入口 |
| `qileso.com` | 不接 | 访问挑战，未获得公开可持续数据入口 |
| `xiaobaipan.com` | 不接 | 首页受限，Sitemap 不可用 |
| `xiongdipan.com` | 不接 | 跳转到 `aipanso.com`，不是独立来源 |
| `xunjiso.com` | 不接 | 跳转到 `alipansou.com`，不是独立来源 |
| `tianyiso.com` | 不接 | 跳转到 `alipansou.com`，不是独立来源 |
| `yiso.fun` | 不接 | 访问挑战，Sitemap 响应不是可解析资源索引 |
| `51yunpan.co` | 不接 | 当前不可连接 |
| `alipanx.com` | 不接 | 当前返回 502 |
| `bifangpu.com` | 不接 | 当前不可连接 |
| `coapan.vip` | 不接 | 当前返回 502 |
| `fulisou.com` | 不接 | 当前返回 502 |
| `iizhi.cn` | 不接 | 当前不可连接 |
| `jupanso.com` | 不接 | 当前不可连接 |
| `jusoso.cc` | 不接 | 当前返回非标准 444 |
| `niceso.net` | 不接 | 当前不可连接 |
| `nmme.icu` | 不接 | 当前不可连接 |
| `pan.club` | 不接 | 当前不可连接 |
| `panmeme.com` | 不接 | 当前返回 503 |
| `pansoso.com` | 不接 | 当前返回 503 |
| `quark.pan.club` | 不接 | 当前不可连接 |
| `quarkfinder.top` | 不接 | 请求持续超时 |
| `repanso.com` | 不接 | 当前返回 503 |
| `sobaozang.com` | 不接 | 当前不可连接 |
| `sopandas.com` | 不接 | 当前返回 503 |
| `vpansou.com` | 不接 | 跳转后返回 503 |
| `wjsou.com` | 不接 | 当前返回 404 |
| `wuyasou.com` | 不接 | 当前不可连接 |
| `xlpanso.com` | 不接 | 当前为域名停放页 |
| `yunpz.net` | 不接 | 当前不可连接 |
| `chigua.cloud` | 不接 | 当前为落地/停放页 |
| `yingso.fun` | 不接 | 只有搜索入口，未发现公开资源索引 |

## 性能与容量

- 所有来源先按规范化 URL 在 D1 主表去重，再记录多来源映射，不重复保存同一分享。
- 2026-07-23 生产验收快照：D1 主表 52,239 条、数据库约 48 MB；`rolling-10` 已同步 90 条，`rolling-11` 已同步 30 条，`rolling-12` 首轮同步 500 条（夸克 397、迅雷 65、UC 30、阿里 6、123 与 115 各 1）。
- 普通 Sitemap 每轮只刷新最新页并推进回填游标；多级 Sitemap 每轮最多读取最新与当前历史两个子 Sitemap。
- 页面抓取并发按站点单独限制为 2–8，超时 20 秒；单页失败不会中断同批其他页面。
- 三字及以上关键词使用 D1 FTS5 trigram；两字词和未迁移环境保留兼容查询。
- 精确标题、标题前缀优先于模糊匹配；已确认失效的链接不进入结果。
- 当前规模继续使用已购买的 Cloudflare Workers + D1 即可，不需要额外购买产品。建议在资源接近 300 万条或 D1 存储超过 60% 时复核保留周期与分库策略。

## 后续复查

- 每月重新检查“保留观察”和暂时不可连接的站点。
- 优先寻找公开 Sitemap、公开 RSS/JSON 和维护活跃的静态清单。
- 对新来源先抽样 20–50 页，计算独立 URL 增量、网盘类型分布、失效率和响应时间，再决定是否进入 Cron。
- 不因为站点更换前端、域名或加密方式而尝试绕过访问控制。
