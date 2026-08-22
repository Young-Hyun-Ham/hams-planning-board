# PlanCraft

AI 프롬프트를 레이어 기반 화면 설계서와 퍼블리싱 코드로 변환하는 Next.js MVP입니다.

## 시작하기

`.env`에 OpenAI API 키를 설정합니다. 이 값은 AI 화면 생성 API의 서버에서만 사용됩니다.

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-sol
```

```bash
pnpm install
pnpm dev
```

## example

```html
<section class="hero">
  <nav class="navigation">
    <a href="/" class="logo">MINSU.</a>
    <div class="nav-menu">
      <a href="#about">About</a>
      <a href="#projects">Projects</a>
      <a href="#contact">Contact</a>
    </div>
  </nav>
  <div class="hero-content">
    <div class="intro">
      <span class="eyebrow">PRODUCT DESIGNER</span>
      <h1>디자인으로 문제를<br />해결하는 김민수입니다.</h1>
      <p>
        사용자의 경험을 깊이 이해하고,<br />더 나은 일상을 만드는 제품을
        디자인합니다.
      </p>
      <a class="cta" href="#projects">프로젝트 보기 →</a>
    </div>
    <div class="profile-image" />
  </div>
</section>
```
