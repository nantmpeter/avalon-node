新版本修复了旧bug，新增了不少功能，也可能会有稳定性风险，请酌情升级，[升级指南](https://github.com/czy88840616/avalon-node/wiki/Install

###0.0.22###

* bugfix 修复了不从根目录开始的combo url的代理问题
* bugfix 修正反向代理php后post请求不生效的问题

###0.0.21###

* bugfix 修正了httpx初始化版本检测提示的问题
* bugfix 修正了layout在vm中指定却无法匹配的问题
* new 模板变量结构显示两种方案
* new php应用的支持，比如tms_sdk
* optimize 应用详情增加默认module，编码的修改，去除添加应用时的选项，调整部分界面

###0.0.20###

* new 增加初始化httpx更新的提示
* new 增加应用级别指定渲染control的功能
* new 增加数字产品ems工具类

###0.0.19###

* bugfix 解决当引入不存在module时的报错问题
* bugfix 解决初始化直接把代理设置成httpx的bug
* bugfix screen列表过滤 #issue45
* bugfix b2b目录结构下查找layout的问题 #issue47
* new 增加一个dateFormatUtil工具类
* new 新增control也可以执行动态数据的功能

###0.0.18###

* new 接入httpx代理
* new 增加request信息自动传递到服务器，这样rundata.request.contextPath也可以用了
* bugfix 动态数据中的跳转修复

###0.0.17###

* bugfix 修复查找包含的模板逻辑，以前只会查找control.setTemplate
* bugfix 修复代理碰到/home路径就会判断出错的问题
* new 增加一些例如pageCache的工具类
* new vmarket内置代理升级，移除域名转ip
* new 支持-v命令查看版本

###0.0.16###

* bugfix 临时处理了一下模板变量解析报错的问题
* new 新加功能，使得特殊应用可以让control和screen共享一份数据

###0.0.15###

* bugfix 因为express路由的顺序问题，assets代理在特殊字符串下无法成功

###0.0.14###

* bugfix 解决*.do的请求时，静态数据为JSON，动态数据没法输出的情况，现在统一在*.do的情况下将静态数据变为字符串处理

###0.0.13###

* bugfix layout查找时应该一层一层目录往上找 #40

###0.0.12###

* optimize 当parse或者control.setTemplate为变量时，在大多数情况下也已经可以获取到正确的模板了

###0.0.11###

* new 自定义设置layout的功能，对应开发在java类中的setLayout
* bugfix 处理tmstool的key不能重复添加的问题
* bugfix 修改由于类不对导致自定义工具类失效的问题
* bugfix 修复一个在点开“查看详情”时报500的问题

###0.0.10###

* bugfix 更新应用导致乱码问题（参数未回写）
* bugfix 新加rundata.setLayout时的layout处理

###0.0.8~0.0.9###

* optimize 升级依赖兼容node 0.10.*
* bugfix 处理了一个不同module的control的json文件获取不到的问题(home:control/a.vm下的json无法获得)
* bugfix 同名module的control中不添加modudle名导致API里NPE的bug

###0.0.6~0.0.7###

* bugfix 当.do的请求而静态数据不是json时的输出纠正，同时动态数据的输出处理，之前是不支持的

###0.0.5###

* bugfix 解决因为回车问题导致移除velocity错误的渲染失败的bug
* bugfix 解决图片不能代理 #32
* new 新增proxy规则校验
* optimize 优化proxy界面，勾选优化

###0.0.4###

* bugfix 解决移除velocity注释的bug #31

###0.0.3###

* new 分离velocity-parser模块，专职负责模板的json输出，更加准确高效
* bugfix 修复当有多个module时模板列表重复的问题
* 界面上的一些小优化
* bugfix #28

###0.0.2###

* bugfix apache、nginx反向代理bugfix

###0.0.1###

* new npm模块名改为vmarket，便于记忆

----
----
**以下为avalon-node的日志，仅记录那逝去的年华**

###0.3.0###

* optimize 优化了吊顶的链接
* optimize 优化了screen的url展示，支持*.do的展示
* bugfix vmcommon配置文件路径错误导致500的bug
* bugfix 解决升级提示由于https的安全问题提示失败的bug

###0.2.9###

* bugfix 修复一个初始化如果非80端口配置页面无法加载的情况
* bugfix 修复初始化应用所属为空导致报错的情况

###0.2.8###

* new 支持静态和动态数据web编辑的功能，模板详情界面调整
* new 支持b2b pageCache的处理
* bugfix 修复b2b查找common模块不存在的错误
* optimize 各个页面的title完善
* optimize 增加从应用详情到模板详情的链接

###0.2.7(mac支持有误)###

* bugfix 修复b2b的部分layout查找失败的bug
* bugfix 不存在json文件时，*.js文件不会生效的bug

###0.2.6###

* new 增加rundata.getModuleInfo().setLayout()的逻辑
* bugfix 修复b2b的adcms的查询逻辑
* bugfix 修复b2b的layout不存在时查找common模块下的layout的逻辑

###0.2.5###

* new 开始支持b2b的目录结构查询和模板渲染，可以选择应用归属
* bugfix assets代理的注释输出会被*/截断时做一些处理
* optimize info页面nav加入文档链接
* optimize 暂时隐藏api的选择

###0.2.4###

* bugfix mac下dos2unix的错误
* optimize 带下划线的vm进行命名提示

###0.2.3###

* bugfix 空模板，但有数据时输出成json结构而不是404
* bugfix 修复一个因为远端404返回报错而导致更新状态判断错误的问题

###0.2.2###

* new 新增快照功能，当本地模板没有改动时，快照可以大大提高展现效率 @neekey
* bugfix 当没有配置域名转ip时，ip填充为127.0.0.1，这样可以在域名绑定时，保证404取到css
* bugfix 空screen的layout渲染 #issue6
* bugfix 同级别default.vm的layout获取错误
* bugfix ie系列不存在JSON对象的fix #issue10
* optimize 首页查看直接链接到当前选中应用的详情
* optimize 应用详情列表对齐
* optimize vmcommon未变化失去焦点不刷新
* optimize 修改检测更新频率，集成在吊顶中
* optimize 工具类placeholder修改，填充成默认值（尝试） #issue4
* optimize 移除吊顶因为github图片而遮住响应式布局的问题

###0.2.1###

* new 新增Metro风格主题
* new 新增api配置和启动自动打开浏览器的配置
* optimize 高亮有数据的vm链接，方便查找
* bugfix 移除velocity注释时的bug

###0.2.0###

* bugfix 调整assets和页面输出编码，让浏览器自己判断
* bugfix 分析模板路径错误和未找到模板目录的报错处理 #issue5
* optimize 解析模板时先过滤一次注释，以免注释的模板做处理
* optimize 一些文案、描述，提示，清理无用依赖和代码
* new 新页底，404页面
* new 通过*.vm可以查看当前页面的信息，包括json和模板依赖的情况
* new 当新增同名应用时，会把旧应用的工具类合并到当前新应用中 #issue7

###0.1.7###

* bugfix 因为上一版加了默认module导致没有module的页面失效了
* bugfix assets代理问题，仅带有问号的参数会代理失败

###0.1.6###

* bugfix 工具类删除失败
* bugfix 本地代理在mac匹配路径错误
* bugfix 设置默认module渲染失败的情况

###0.1.5###

* bugfix 未查找默认layout导致渲染页面为空
* new 给动态逻辑添加了appConfig对象
* new 首页新增更新提醒
* new 新增一个启动参数-o 用于打开初始化页面

###0.1.4###

* bugfix 未分析目录直接点保存也会执行
* bugfix 填写路径后多了斜杠导致应用名出错
* bugfix 添加一个命令vm help用于打开帮助文档，导航也添加了文档链接
* bugfix 访问localhost时的assets处理

###0.1.2~0.1.3###

* bugfix mac npm install encoding error

###0.1.1###

* bugfix assets代理的一个小问题

###0.1.0###

* 基本实现了旧版vmarket拥有的功能
* 废弃旧向导，使用新的ui方式进行交互
* 实现了js处理业务逻辑代替以前的groovy方式
