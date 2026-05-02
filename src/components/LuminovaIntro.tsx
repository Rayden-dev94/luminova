'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function preloadImages(imgs: HTMLImageElement[]): Promise<void[]> {
  const toPromise = (img: HTMLImageElement): Promise<void> => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve()
    if (typeof img.decode === 'function') return img.decode().catch(() => {})
    return new Promise<void>((res) => {
      img.addEventListener('load', () => res(), { once: true })
      img.addEventListener('error', () => res(), { once: true })
    })
  }
  return Promise.all(imgs.map(toPromise))
}

function responsiveGap(): number {
  const vv = window.visualViewport
  const vw = vv ? vv.width : window.innerWidth
  const isPhone = vw <= 480
  const g = Math.round(vw * 0.025)
  return isPhone ? Math.max(6, Math.min(g, 16)) : Math.max(16, Math.min(g, 50))
}

function startSlideshow(
  slides: HTMLDivElement[],
  opts: { interval?: number; fade?: number; onThird?: () => void }
): () => void {
  const { interval = 0.9, fade = 0.3, onThird } = opts
  let index = 0
  let prev = slides[0]
  let cancelled = false

  const advance = () => {
    if (cancelled) return
    const nextIndex = (index + 1) % slides.length
    const next = slides[nextIndex]

    gsap.to(prev, { autoAlpha: 0, duration: fade, ease: 'power2.inOut' })
    gsap.to(next, { autoAlpha: 1, duration: fade, ease: 'power2.inOut' })

    if (nextIndex === 3 && typeof onThird === 'function') {
      cancelled = true
      gsap.delayedCall(fade + 0.05, onThird)
      return
    }

    prev = next
    index = nextIndex
    gsap.delayedCall(interval, advance)
  }

  gsap.delayedCall(0.05, advance)
  return () => { cancelled = true }
}

interface RevealArgs {
  main: HTMLElement
  showcase: HTMLDivElement
  slides: HTMLDivElement[]
  lumi: HTMLElement
  nova: HTMLElement
  preTitle: HTMLHeadingElement
  finalTitle: HTMLElement
  wevin: HTMLElement
  menuLinks: HTMLElement
  preloadRevealPromise: Promise<void[]>
  finalizedRef: React.MutableRefObject<boolean>
}

async function revealFullscreenFLIP({
  main, showcase, slides, lumi, nova,
  preTitle, finalTitle, wevin, menuLinks,
  preloadRevealPromise, finalizedRef,
}: RevealArgs) {
  slides.forEach((s, i) => gsap.set(s, { autoAlpha: i === 3 ? 1 : 0 }))

  const activeImg = slides[3].querySelector('img') as HTMLImageElement
  try { await preloadRevealPromise } catch {}

  const r = activeImg.getBoundingClientRect()

  const layer = document.createElement('div')
  layer.className = 'fullscreen-layer'
  const hi = document.createElement('img')
  hi.alt = activeImg.alt ?? ''
  // Use original path from data-src — next/image currentSrc is a resized/optimised URL
  // that would look pixelated when expanded to fullscreen.
  hi.src = slides[3].dataset.src ?? activeImg.src
  layer.appendChild(hi)
  main.appendChild(layer)

  showcase.style.visibility = 'hidden'

  const layerRect = layer.getBoundingClientRect()
  const vw = layerRect.width
  const vh = layerRect.height

  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const vx = layerRect.left + vw / 2
  const vy = layerRect.top + vh / 2

  gsap.set(layer, {
    transformOrigin: '50% 50% 0',
    force3D: true,
    x: cx - vx,
    y: cy - vy,
    scaleX: r.width / vw,
    scaleY: r.height / vh,
  })

  // ── FLIP expand to fullscreen ─────────────────────────────────
  const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } })

  tl.to(lumi, { x: '-120vw', autoAlpha: 0, duration: 0.75, ease: 'expo.in' }, 0.05)
  tl.to(nova, { x: '120vw', autoAlpha: 0, duration: 0.75, ease: 'expo.in' }, 0.05)
  tl.to(layer, { duration: 1.1, x: 0, y: 0, scaleX: 1, scaleY: 1, force3D: true }, 0)

  // ── UI reveal sequence ─────────────────────────────────────────
  tl.add(() => {
    finalizedRef.current = true

    const isPhone = (window.visualViewport?.width ?? window.innerWidth) <= 480

    const placeFinalTitleMobile = (offset = 12) => {
      if (!isPhone) return
      const preBottom = preTitle.getBoundingClientRect().bottom
      finalTitle.style.top = `${Math.round(preBottom + offset)}px`
    }

    const ui = gsap.timeline()

    // ── Title: character-by-character stagger reveal ────────────
    const chars = Array.from(preTitle.querySelectorAll('span'))
    ui.add(() => preTitle.removeAttribute('aria-hidden'))
    ui.fromTo(
      chars,
      { y: 55, opacity: 0, rotateX: -20 },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.04,
        ease: 'expo.out',
        transformOrigin: '50% 100%',
      }
    )

    // ── Tagline: wipe-up from bottom ────────────────────────────
    ui.add(() => { placeFinalTitleMobile(12); finalTitle.removeAttribute('aria-hidden') }, '+=0.08')
    ui.fromTo(
      finalTitle,
      { y: 28, opacity: 0, letterSpacing: '0.18em' },
      {
        y: 0,
        opacity: 1,
        letterSpacing: '0.03em',
        duration: 1.1,
        ease: 'expo.out',
        onComplete: () => {
          menuLinks.removeAttribute('aria-hidden')
          menuLinks.style.visibility = 'visible'
          gsap.to(menuLinks.querySelectorAll('li'), {
            opacity: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.1,
            ease: 'expo.out',
            onComplete: () => { menuLinks.style.pointerEvents = 'auto' },
          })
        },
      }
    )

    // ── Studio byline ────────────────────────────────────────────
    ui.add(() => {
      wevin.removeAttribute('aria-hidden')
      gsap.fromTo(
        wevin,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }
      )
    }, '+=0.25')
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Split brand letters for per-character animation
const BRAND_CHARS = ['L', 'U', 'M', 'I', '\u00a0', 'N', 'O', 'V', 'A']

export default function LuminovaIntro() {
  const mainRef = useRef<HTMLElement>(null)
  const lumiRef = useRef<HTMLParagraphElement>(null)
  const novaRef = useRef<HTMLParagraphElement>(null)
  const showcaseRef = useRef<HTMLDivElement>(null)
  const brandMaskRef = useRef<HTMLDivElement>(null)
  const preTitleRef = useRef<HTMLHeadingElement>(null)
  const finalTitleRef = useRef<HTMLParagraphElement>(null)
  const wevinRef = useRef<HTMLParagraphElement>(null)
  const menuLinksRef = useRef<HTMLElement>(null)
  const slidesRef = useRef<HTMLDivElement[]>([])
  const finalizedRef = useRef(false)

  // ── --vh variable ──────────────────────────────────────────────────────
  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--vh', `${h}px`)
    }
    setVh()
    window.addEventListener('resize', setVh, { passive: true })
    window.addEventListener('orientationchange', setVh, { passive: true })
    return () => {
      window.removeEventListener('resize', setVh)
      window.removeEventListener('orientationchange', setVh)
    }
  }, [])

  // ── Mobile finalTitle repositioning ───────────────────────────────────
  useEffect(() => {
    const handle = () => {
      if (!finalizedRef.current) return
      if ((window.visualViewport?.width ?? window.innerWidth) > 480) return
      const preTitle = preTitleRef.current
      const finalTitle = finalTitleRef.current
      if (!preTitle || !finalTitle) return
      finalTitle.style.top = `${Math.round(preTitle.getBoundingClientRect().bottom + 12)}px`
    }
    window.addEventListener('resize', handle, { passive: true })
    return () => window.removeEventListener('resize', handle)
  }, [])

  // ── Main animation sequence ────────────────────────────────────────────
  useEffect(() => {
    const main = mainRef.current!
    const lumi = lumiRef.current!
    const nova = novaRef.current!
    const showcase = showcaseRef.current!
    const brandMask = brandMaskRef.current!
    const preTitle = preTitleRef.current!
    const finalTitle = finalTitleRef.current!
    const wevin = wevinRef.current!
    const menuLinks = menuLinksRef.current!
    const slides = slidesRef.current

    const slideImgs = slides.map(s => s.querySelector('img') as HTMLImageElement)
    const preloadCoverPromise = preloadImages([slideImgs[0]])
    const preloadRevealPromise = preloadImages([slideImgs[3]])
    preloadImages(slideImgs)

    gsap.set(slides[0], { autoAlpha: 1 })

    let stopSlideshow: (() => void) | null = null
    let unmounted = false

    const run = async () => {
      // ── Entry: letters materialise from blur ────────────────────────
      await new Promise<void>((resolve) => {
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .fromTo(
            lumi,
            { y: -32, opacity: 0, filter: 'blur(10px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.0 }
          )
          .fromTo(
            nova,
            { y: 32, opacity: 0, filter: 'blur(10px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.0 },
            '<0.06'
          )
          .add(resolve)
      })

      if (unmounted) return
      try { await preloadCoverPromise } catch {}
      if (unmounted) return

      // ── Split: letters open to reveal slideshow ──────────────────────
      const lumiRect = lumi.getBoundingClientRect()
      const novaRect = nova.getBoundingClientRect()
      const showcaseRect = showcase.getBoundingClientRect()
      const GAP = responsiveGap()

      const lumiTargetX = showcaseRect.left - lumiRect.right - GAP
      const novaTargetX = showcaseRect.right - novaRect.left + GAP

      const tlSplit = gsap.timeline({ defaults: { ease: 'expo.inOut' } })

      tlSplit.add(() => {
        showcase.style.visibility = 'visible'
        gsap.to(brandMask, {
          autoAlpha: 0,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => { brandMask.style.display = 'none' },
        })
      }, 0)

      tlSplit.to(lumi, { x: lumiTargetX, duration: 1.0 }, 0)
      tlSplit.to(nova, { x: novaTargetX, duration: 1.0 }, 0)

      tlSplit.add(() => {
        if (unmounted) return
        stopSlideshow = startSlideshow(slides, {
          interval: 1.0,
          fade: 0.3,
          onThird: () => revealFullscreenFLIP({
            main, showcase, slides, lumi, nova,
            preTitle, finalTitle, wevin, menuLinks,
            preloadRevealPromise, finalizedRef,
          }),
        })
      })
    }

    run()

    return () => {
      unmounted = true
      stopSlideshow?.()
      gsap.killTweensOf([lumi, nova, showcase, brandMask, preTitle, finalTitle, wevin, menuLinks, ...slides])
    }
  }, [])

  return (
    <main
      ref={mainRef}
      className="relative flex items-center justify-center w-full h-screen"
      style={{ perspective: '1200px', overflowX: 'clip' }}
    >
      {/* Brand letters ─ aria-hidden: the real h1 is #preTitle */}
      <div
        id="brand"
        aria-hidden="true"
        className="font-black text-6xl sm:text-8xl text-gray-900 flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <p ref={lumiRef} id="lumi">LUMI</p>
        <p ref={novaRef} id="nova">NOVA</p>
      </div>

      <div ref={brandMaskRef} id="brandMask" aria-hidden="true" />

      {/* Single h1 — characters wrapped in spans for stagger animation */}
      <h1
        ref={preTitleRef}
        id="preTitle"
        className="fixed top-6 left-1/2 -translate-x-1/2 z-30 font-black tracking-[0.1em] smoke opacity-0 select-none pointer-events-none text-center uppercase w-[min(92vw,1200px)] text-[clamp(36px,9vw,110px)]"
        aria-hidden="true"
        style={{ textWrap: 'balance' } as React.CSSProperties}
      >
        {BRAND_CHARS.map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </h1>

      {/* Tagline — Cormorant italic, was incorrectly h1 */}
      <p
        ref={finalTitleRef}
        id="finalTitle"
        className="fixed left-1/2 -translate-x-1/2 z-20 opacity-0 select-none pointer-events-none text-center w-[min(92vw,960px)] text-[clamp(22px,4.5vw,58px)]"
        aria-hidden="true"
        style={{ top: 'clamp(180px, 36vh, 520px)', textWrap: 'balance' } as React.CSSProperties}
      >
        Let&apos;s build something to remember
      </p>

      {/* Studio byline — Cormorant italic */}
      <p
        ref={wevinRef}
        id="wevin"
        className="fixed right-8 text-xl sm:text-2xl opacity-0 select-none pointer-events-none z-20"
        aria-hidden="true"
        style={{ bottom: 'calc(50px + env(safe-area-inset-bottom, 0px))' }}
      >
        Concept Design by&nbsp;<strong>WEVIN</strong>
        <span className="align-super text-xs ml-[1px]">©</span>
      </p>

      {/* Slideshow */}
      <div
        ref={showcaseRef}
        id="showcase"
        className="flex items-center justify-center w-[300px] max-w-[80vw] aspect-[16/9]"
      >
        {[1, 2, 3, 4, 5].map((n, i) => (
          <div
            key={n}
            className="slide"
            data-src={`/img/img${n}.jpg`}
            ref={(el) => { if (el) slidesRef.current[i] = el }}
          >
            <Image
              src={`/img/img${n}.jpg`}
              alt={`Luminova ${n}`}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              sizes="(max-width: 480px) 46vw, 300px"
              quality={90}
              priority={n === 1}
            />
          </div>
        ))}
      </div>

      {/* Navigation — revealed at the end of the sequence */}
      <nav
        ref={menuLinksRef as React.RefObject<HTMLElement>}
        id="menuLinks"
        className="fixed inset-0 flex items-center justify-center select-none"
        aria-label="Menu principale"
        aria-hidden="true"
      >
        <ul className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 rounded-2xl px-8 py-4">
          {[
            { label: 'Project', href: '#project' },
            { label: 'Services', href: '#services' },
            { label: 'Github', href: 'https://github.com/', external: true },
          ].map(({ label, href, external }) => (
            <li key={label}>
              <a
                href={href}
                className="px-2 py-1"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
