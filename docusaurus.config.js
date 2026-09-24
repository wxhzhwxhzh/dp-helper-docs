// @ts-check
// `@type` JSDoc 注释可以启用编辑器的自动补全和类型检查
// （配合 `@ts-check` 使用）。
// 声明 Docusaurus 配置有多种等效写法。
// 参见：https://docusaurus.io/docs/api/docusaurus-config
import {themes as prismThemes} from 'prism-react-renderer';
// 此文件运行在 Node.js 环境 —— 请勿在此使用浏览器端代码（浏览器 API、JSX 等）
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'dp_helper',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/saologo.png',
  // 未来功能开关，参见 https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // 提升与即将到来的 Docusaurus v4 的兼容性
  },
  // 在此设置站点的正式线上地址
  url: 'https://wxhzhwxhzh.github.io',
  // 设置站点被访问时的路径前缀 /<baseUrl>/
  // 部署到 GitHub Pages 时，通常设为 '/<项目名>/'
  baseUrl: '/dp-helper-docs/',
  // GitHub Pages 部署配置。
  // 如果不使用 GitHub Pages，就不需要配置这些。
  organizationName: 'wxhzhwxhzh', // 通常是你的 GitHub 组织名或用户名
  projectName: 'dp-helper-docs', // 通常是你的仓库名
  deploymentBranch: 'gh-pages', // 明确指定部署分支
  trailingSlash: false, // 解决上次的警告
  onBrokenLinks: 'throw',
  // 即使不使用国际化，也可以用这个字段设置有用的元数据，
  // 例如 html 的语言属性。如果你的站点是中文的，
  // 可以把 "en" 替换为 "zh-Hans"。
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // 文档直接挂在网站根路径；首页指定为哪篇文档，
          // 在该文档 frontmatter 里写 slug: / 即可（见 docs/intro.mdx）
          routeBasePath: '/',
          // 请改为你自己的仓库地址。
          // 删除此项可去掉"编辑此页"链接。
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: {
          showReadingTime: true,
          // 显示所有博客文章
          blogSidebarCount: 'ALL',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // 请改为你自己的仓库地址。
          // 删除此项可去掉"编辑此页"链接。
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // 用于规范博客写作的一些实用选项
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  // ====== 新增：注册图片放大插件 ======
  plugins: [
    'docusaurus-plugin-image-zoom',
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // 替换为你项目的社交分享卡片图
      image: 'img/saologo.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: '骚神插件',
        logo: {
          alt: 'My Site Logo',
          src: 'img/icon.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: '使用文档',
          },
          {to: '/blog', label: '日志', position: 'left'},
          {
            href: 'https://github.com/wxhzhwxhzh/dp-helper-docs',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://space.bilibili.com/48179703',
            label: 'BiliBili',
            position: 'right',
          },
          {
            type: 'dropdown',
            label: 'RuyiPage',
            position: 'right',
            items: [
              {label: 'RuyiPage文档官网', href: 'https://0xshoulderlab.site/automation'},
              {label: 'RuyiPage GitHub', href: 'https://github.com/LoseNine/ruyipage'},
            ],
          },
          {
            type: 'dropdown',
            label: 'DrissionPage',
            position: 'right',
            items: [
              {label: 'DP官网', href: 'https://drissionpage.cn/'},
              {label: '骚神网', href: 'https://wxhzhwxhzh.github.io/sao/'},
              {label: '工具库', href: 'https://wxhzhwxhzh.github.io/dptool/'},
              {label: 'MCP', href: 'https://github.com/wxhzhwxhzh/DrissionPageMCP'},
              {label: 'CLI', href: 'https://gitcode.com/saocode/drissionpage-cli'},
              {label: 'Scrape爬虫靶场', href: 'https://scrape.center/'},
              {label: '自动化测试靶场', href: 'https://wxhzhwxhzh.github.io/test_page/'},
              {label: 'DP运行流程图', href: 'https://4m3h6501ydgua.aiforce.cloud/app/app_17ehncs9ds7'},
             
            ],
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Tutorial',
                to: '/',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              },
              {
                label: 'Discord',
                href: 'https://discordapp.com/invite/docusaurus',
              },
              {
                label: 'X',
                href: 'https://x.com/docusaurus',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/facebook/docusaurus',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },

      // ====== 新增 zoom 配置（放在themeConfig内部） ======
      zoom: {
        selector: '.markdown :not(em) > img',
        background: {
          light: 'rgb(255,255,255)',
          dark: 'rgb(30,30,30)',
        },
        config: {
          margin: 24,
          scrollOffset: 40,
        },
      },
    }),
};

export default config;
