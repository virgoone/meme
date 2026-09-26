import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { siteIdentity } from '@meme/shared';

export function SiteInfoPage({ title, introduction, children }: { title: string; introduction: string; children: ReactNode }) {
  return <article className='site-info-page'>
    <header className='site-info-header'>
      <Link to='/' className='site-info-home'>Koya / 个人博客</Link>
      <h1>{title}</h1>
      <p>{introduction}</p>
    </header>
    <div className='site-info-body'>{children}</div>
  </article>;
}

export function ContactEmail() {
  return <a href={`mailto:${siteIdentity.email}`}>{siteIdentity.email}</a>;
}

export function AboutPage() {
  return <SiteInfoPage title='关于我' introduction='你好，我是 Koya，一个喜欢把想法做成产品的小全栈。'>
    <section><h2>这里记录什么</h2>
      <p>我在这个博客记录真实项目里的开发过程：从前端交互到服务端，从 AI 应用、SaaS 工作流到 Cloudflare 上的部署与数据同步。也会写远程开发、家庭网络，以及自己用得上的工具。</p>
      <p>比起只展示最后的界面，我更想留下设计取舍、踩过的坑和修改的原因。你可以从 <Link to='/blog'>文章列表</Link> 或 <Link to='/projects'>项目页</Link> 找到感兴趣的内容。</p>
    </section>
    <section><h2>代码与日常</h2>
      <p>我的公开代码在 <a href={siteIdentity.profiles[0]} rel='me'>GitHub · virgoone</a>，日常分享在 <a href={siteIdentity.profiles[1]} rel='me'>X · @koyaguo</a>。我在使用和维护的一些工具整理在 <a href='https://douni.one/'>douni.one</a>。</p>
    </section>
    <section><h2>关于文章里的结论</h2>
      <p>技术文章会尽量交代当时使用的版本、实现背景和参考资料。个人项目里的做法有具体前提，第三方服务也可能在文章发布后发生变化；阅读时可以结合文中的日期和官方文档核对。</p>
      <p>如果你发现代码、链接或事实有误，欢迎在文章下留言，或通过 <Link to='/contact'>联系页</Link> 告诉我。文章的作者署名统一使用 Koya。</p>
    </section>
  </SiteInfoPage>;
}

export function ContactPage() {
  return <SiteInfoPage title='联系我' introduction='发现一处错误，想交流一个实现，或者只是打个招呼，都欢迎。'>
    <section><h2>邮件</h2><p><ContactEmail /></p>
      <p>反馈文章问题时，请附上文章链接、相关段落，以及你使用的版本或复现步骤。涉及账号、隐私或内容删除的请求，也请使用这个邮箱；不要把验证码、密码或其他敏感信息写在公开评论里。</p>
    </section>
    <section><h2>公开交流</h2>
      <p>具体的技术问题可以直接留在文章对应段落下，其他读者也能一起讨论。随手留言可以去 <Link to='/guestbook'>留言墙</Link>；评论和留言需要先登录。</p>
      <p>也可以在 <a href={siteIdentity.profiles[0]}>GitHub · virgoone</a> 查看项目，或在 <a href={siteIdentity.profiles[1]}>X · @koyaguo</a> 找到我。</p>
    </section>
  </SiteInfoPage>;
}

export function PrivacyPage() {
  return <SiteInfoPage title='隐私政策' introduction='这份说明介绍 blog.douni.one 在阅读、登录、互动和订阅时如何使用数据。'>
    <p className='site-info-updated'>更新日期：<time dateTime='2026-09-25'>2026 年 9 月 25 日</time></p>
    <section><h2>阅读、登录与公开互动</h2>
      <p>阅读公开文章不需要创建账号。登录时，站点使用邮箱验证码，并保存账号邮箱、昵称、头像及会话信息，以识别登录状态和管理权限。验证邮件通过 Resend 发送。</p>
      <p>发表评论或留言后，你的昵称、头像、内容及发布时间会向其他读者公开。登录邮箱不会作为评论署名公开展示。请不要在公开内容中提交个人敏感信息。</p>
    </section>
    <section><h2>访问统计与最近访客</h2>
      <p>站点统计页面和文章浏览次数，并使用 Cloudflare 随请求提供的大致城市与国家信息，在页脚展示最近访客地区。这不是设备 GPS 定位，公开的最近访客记录不包含 IP 地址。</p>
      <p>站点还接入 Google Analytics 4，用于了解页面访问与来源。Google 可能通过 Cookie 等技术收集访问数据。服务器、托管服务和登录会话也可能处理 IP 地址、浏览器信息及请求日志，用于提供服务、会话管理和安全排查。</p>
    </section>
    <section><h2>广告与 Cookie</h2>
      <p>站点使用 Google AdSense 展示广告。Google 及其他第三方广告供应商可能使用 Cookie，根据你之前对本站或其他网站的访问展示广告。广告脚本可能在广告实际显示之前使用 Cookie。</p>
      <p>你可以通过 <a href='https://myadcenter.google.com/'>Google 我的广告中心</a> 管理个性化广告，通过 <a href='https://optout.aboutads.info/'>YourAdChoices</a> 了解其他参与供应商的退出选项，也可以在浏览器中限制或删除 Cookie。具体数据使用请参阅 <a href='https://policies.google.com/technologies/partner-sites'>Google 在合作伙伴网站上的数据使用说明</a>、<a href='https://policies.google.com/privacy'>Google 隐私政策</a>及其<a href='https://support.google.com/admanager/answer/9012903'>广告技术提供商说明</a>。</p>
      <p>登录会话需要 Cookie；页面主题等偏好会保存在浏览器本地存储中。清除这些数据可能会退出登录或重置偏好。</p>
    </section>
    <section><h2>邮件订阅</h2>
      <p>订阅功能保存邮箱、订阅确认状态、退订标识和邮件交付记录，用于发送你订阅的更新。你可以使用更新邮件中的退订入口，或通过下方邮箱联系我取消订阅。</p>
    </section>
    <section><h2>服务提供商与保存</h2>
      <p>本站使用 Cloudflare 提供应用运行、数据库和文件存储，使用 Vercel 作为部分访问入口，使用 Resend 发送邮件。这些服务可能在不同地区处理请求与数据。相关说明见 <a href='https://www.cloudflare.com/privacypolicy/'>Cloudflare</a>、<a href='https://vercel.com/legal/privacy-notice'>Vercel</a> 和 <a href='https://resend.com/legal/privacy-policy'>Resend</a> 的隐私政策。</p>
      <p>账号、评论及订阅记录会在提供对应功能期间保存；日志、第三方统计和备份的保存时间取决于相关服务配置。删除公开内容与清理备份、第三方缓存并不一定同时完成。</p>
    </section>
    <section><h2>联系与数据请求</h2>
      <p>如需查询、更正或删除与你有关的账号、留言或订阅数据，请联系 <ContactEmail />，并提供便于定位记录的信息。处理前可能需要确认该账号或邮箱属于你。</p>
      <p>站点功能或数据使用方式变化时，这份说明也会更新，并在页首标记日期。</p>
    </section>
  </SiteInfoPage>;
}

export function TermsPage() {
  return <SiteInfoPage title='使用条款' introduction='关于本站内容的引用、技术实践和公开交流。'>
    <p className='site-info-updated'>更新日期：<time dateTime='2026-09-25'>2026 年 9 月 25 日</time></p>
    <section><h2>内容与引用</h2>
      <p>本站由 Koya 维护。除另有署名或许可说明的内容外，文章为个人开发记录。引用少量内容时请保留作者署名和原文链接；如需整篇转载、商业使用或使用原创配图，请先通过 <Link to='/contact'>联系页</Link> 沟通。</p>
      <p>文中引用的第三方资料、图片、项目与商标归各自权利人所有；开源项目及示例的使用应遵守其对应许可证。</p>
    </section>
    <section><h2>技术实践</h2>
      <p>文章里的操作基于写作时的项目、软件版本与环境。执行部署、数据库迁移、设备刷机等操作前，请核对当前官方文档并备份数据。文中的外部链接或服务可能发生变化。</p>
    </section>
    <section><h2>评论与留言</h2>
      <p>欢迎提出不同意见、补充资料与复现问题。请勿发布垃圾广告、冒用他人身份、泄露他人隐私，或提交侵犯他人权利的内容。为维护讨论环境，站点可能移除不适当的内容。</p>
      <p>如果你希望更正或移除自己的留言，或认为某项内容侵犯了你的权利，请联系 <ContactEmail /> 并附上具体链接。</p>
    </section>
    <section><h2>隐私与联系</h2>
      <p>账号、访问统计、广告和邮件订阅的数据使用方式见 <Link to='/privacy'>隐私政策</Link>。其他问题可以通过 <Link to='/contact'>联系页</Link> 反馈。</p>
    </section>
  </SiteInfoPage>;
}
