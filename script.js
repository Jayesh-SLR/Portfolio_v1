(() => {
  'use strict';

  // ========================================================================
  // Reduced Motion Detection
  // ========================================================================
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ========================================================================
  // Canvas Scroll Animation (PRESERVED & OPTIMIZED)
  // ========================================================================
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const FRAME_COUNT = 300;
  const FOLDER_PATH = './background_img';
  const isMobile = window.innerWidth < 768;

  // Format frame URL with 3-digit zero-padding
  const getFrameUrl = (index) => {
    const pad = String(index).padStart(3, '0');
    return `${FOLDER_PATH}/ezgif-frame-${pad}.jpg`;
  };

  const images = new Array(FRAME_COUNT);
  const loaded = new Array(FRAME_COUNT).fill(false);

  let currentFrame = 0;
  let targetFrame = 0;
  let lastRenderedIndex = -1;
  let rafId = null;

  // Set up canvas sizing with devicePixelRatio
  function resizeCanvas() {
    // Limit DPR on mobile for performance
    const dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 1.5) : (window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    lastRenderedIndex = -1;
    render();
    updateScrollTarget();
  }

  // Preloader Elements & State
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPercent = document.getElementById('preloader-percent');
  const preloaderStatus = document.getElementById('preloader-status');

  let loadedCount = 0;
  let visualProgress = 0;
  let isFinished = false;
  const startTime = performance.now();
  const LOAD_DURATION = 1400;

  // Prevent scroll during loading
  document.body.style.overflow = 'hidden';

  function dismissPreloader() {
    if (isFinished) return;
    isFinished = true;

    if (preloaderBar) preloaderBar.style.width = '100%';
    if (preloaderPercent) preloaderPercent.textContent = '100%';
    if (preloaderStatus) preloaderStatus.textContent = 'EXPERIENCES READY';

    render();

    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
        preloader.style.pointerEvents = 'none';
      }
      document.body.style.overflow = '';

      // Init features after preloader dismisses
      setTimeout(() => {
        if (preloader) {
          preloader.style.display = 'none';
          if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
          }
        }
        initRevealAnimations();
      }, 850);
    }, 280);
  }

  function updatePreloaderUI() {
    if (isFinished) return;

    const elapsed = performance.now() - startTime;
    const timeProgress = Math.min((elapsed / LOAD_DURATION) * 100, 100);

    visualProgress += (timeProgress - visualProgress) * 0.15;

    if (preloaderBar) {
      preloaderBar.style.width = `${Math.min(visualProgress, 100)}%`;
    }
    if (preloaderPercent) {
      preloaderPercent.textContent = `${Math.min(Math.round(visualProgress), 100)}%`;
    }

    if (elapsed >= LOAD_DURATION && visualProgress >= 98) {
      dismissPreloader();
      return;
    }

    requestAnimationFrame(updatePreloaderUI);
  }

  // Safety timeout
  setTimeout(() => {
    if (!isFinished) dismissPreloader();
  }, 2200);

  // Preload frames
  function preloadImages() {
    // Priority: load first frame
    const firstImg = new Image();
    firstImg.src = getFrameUrl(1);
    firstImg.onload = () => {
      images[0] = firstImg;
      loaded[0] = true;
      loadedCount++;
      render();
    };

    // Load remaining frames in batches for performance
    const batchSize = isMobile ? 4 : 8;
    let batchIndex = 2;

    function loadBatch() {
      for (let j = 0; j < batchSize && batchIndex <= FRAME_COUNT; j++, batchIndex++) {
        const i = batchIndex;
        if (i === 1) continue;
        const img = new Image();
        img.src = getFrameUrl(i);
        const index = i - 1;
        img.onload = () => {
          images[index] = img;
          loaded[index] = true;
          loadedCount++;
        };
        img.onerror = () => {
          loadedCount++;
        };
      }

      if (batchIndex <= FRAME_COUNT) {
        requestAnimationFrame(loadBatch);
      }
    }

    loadBatch();
    requestAnimationFrame(updatePreloaderUI);
  }

  // Find the closest loaded frame
  function getClosestLoadedFrame(targetIdx) {
    if (loaded[targetIdx]) return images[targetIdx];

    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 0 && loaded[prev]) return images[prev];

      const next = targetIdx + offset;
      if (next < FRAME_COUNT && loaded[next]) return images[next];
    }
    return null;
  }

  // Draw image with cover behavior
  function drawCover(img) {
    if (!img) return;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    if (!imgWidth || !imgHeight) return;

    const hRatio = canvasWidth / imgWidth;
    const vRatio = canvasHeight / imgHeight;
    const ratio = Math.max(hRatio, vRatio);

    const drawWidth = imgWidth * ratio;
    const drawHeight = imgHeight * ratio;
    const shiftX = (canvasWidth - drawWidth) / 2;
    const shiftY = (canvasHeight - drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, shiftX, shiftY, drawWidth, drawHeight);
  }

  // Calculate target frame from scroll position
  function updateScrollTarget() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const maxScroll = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;

    if (maxScroll <= 0) {
      targetFrame = 0;
      return;
    }

    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    targetFrame = progress * (FRAME_COUNT - 1);
  }

  function render() {
    const frameIndex = Math.min(Math.max(Math.round(currentFrame), 0), FRAME_COUNT - 1);
    const img = getClosestLoadedFrame(frameIndex);

    if (img && frameIndex !== lastRenderedIndex) {
      drawCover(img);
      lastRenderedIndex = frameIndex;
    }
  }

  // Smooth lerp loop
  function tick() {
    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) > 0.01) {
      currentFrame += delta * 0.1;
      render();
    }

    rafId = requestAnimationFrame(tick);
  }

  // ========================================================================
  // Canvas Overlay — Dynamic intensity per section
  // ========================================================================
  const canvasOverlay = document.getElementById('canvas-overlay');
  let currentOverlayOpacity = 0;
  let targetOverlayOpacity = 0;

  function updateCanvasOverlay() {
    const sections = document.querySelectorAll('[data-canvas-opacity]');
    const scrollCenter = window.innerHeight / 2;

    let closestSection = null;
    let closestDist = Infinity;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const dist = Math.abs(sectionCenter - scrollCenter);

      if (dist < closestDist) {
        closestDist = dist;
        closestSection = section;
      }
    });

    if (closestSection) {
      targetOverlayOpacity = parseFloat(closestSection.getAttribute('data-canvas-opacity'));
    }
  }

  function lerpOverlay() {
    const delta = targetOverlayOpacity - currentOverlayOpacity;
    if (Math.abs(delta) > 0.001) {
      currentOverlayOpacity += delta * 0.08;
      if (canvasOverlay) {
        canvasOverlay.style.backgroundColor = `rgba(0, 0, 0, ${currentOverlayOpacity})`;
      }
    }
    requestAnimationFrame(lerpOverlay);
  }

  lerpOverlay();

  // ========================================================================
  // Active Navigation Highlight
  // ========================================================================
  const allNavLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = (window.scrollY || document.documentElement.scrollTop) + 250;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        allNavLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // ========================================================================
  // Scroll Progress Bar
  // ========================================================================
  const scrollProgressBar = document.getElementById('scroll-progress');

  function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const progress = (scrollTop / maxScroll) * 100;
    if (scrollProgressBar) {
      scrollProgressBar.style.width = `${progress}%`;
    }
  }

  // ========================================================================
  // Navbar Scroll State
  // ========================================================================
  const navbar = document.querySelector('.navbar');

  function updateNavbarState() {
    if (!navbar) return;
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // ========================================================================
  // Scroll Handler — Single Passive Listener
  // ========================================================================
  let scrollTicking = false;

  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateScrollTarget();
        updateActiveNav();
        updateScrollProgress();
        updateNavbarState();
        updateCanvasOverlay();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas, { passive: true });

  // ========================================================================
  // IntersectionObserver Reveal Animations
  // ========================================================================
  function initRevealAnimations() {
    if (prefersReducedMotion) {
      // Immediately reveal everything
      document.querySelectorAll('.reveal-el').forEach(el => {
        el.classList.add('revealed');
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal-el').forEach(el => {
      observer.observe(el);
    });
  }

  // ========================================================================
  // System Architecture Flow Animation
  // ========================================================================
  function initArchitectureAnimation() {
    const archFlow = document.getElementById('arch-flow');
    if (!archFlow) return;

    const archObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateArchFlow();
          archObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    archObserver.observe(archFlow);
  }

  function animateArchFlow() {
    const nodes = document.querySelectorAll('.arch-node');
    const arrows = document.querySelectorAll('.arch-arrow');

    if (prefersReducedMotion) {
      nodes.forEach(n => n.classList.add('animated'));
      arrows.forEach(a => a.classList.add('animated'));
      return;
    }

    let delay = 0;
    const nodeArr = Array.from(nodes);
    const arrowArr = Array.from(arrows);

    nodeArr.forEach((node, i) => {
      setTimeout(() => {
        node.classList.add('animated');
      }, delay);
      delay += 250;

      if (i < arrowArr.length) {
        setTimeout(() => {
          arrowArr[i].classList.add('animated');
        }, delay);
        delay += 150;
      }
    });
  }

  // ========================================================================
  // Custom Cursor (Desktop Only)
  // ========================================================================
  const cursor = document.getElementById('custom-cursor');
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (cursor && !isTouch && !prefersReducedMotion) {
    let cursorX = 0, cursorY = 0;
    let currentCX = 0, currentCY = 0;

    document.addEventListener('mousemove', (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
    }, { passive: true });

    function updateCursor() {
      currentCX += (cursorX - currentCX) * 0.15;
      currentCY += (cursorY - currentCY) * 0.15;
      cursor.style.transform = `translate3d(${currentCX}px, ${currentCY}px, 0)`;
      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    // Interactive states
    const interactiveElements = 'a, button, .project-card, [data-cursor], input, textarea, .trusted-badge, .skill-card, .contact-card, .building-card';

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest(interactiveElements);
      if (target) {
        cursor.classList.add('hovering');
        const label = target.getAttribute('data-cursor');
        if (label) {
          cursor.classList.add('has-label');
          cursor.querySelector('.cursor-label').textContent = label;
        }
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest(interactiveElements);
      if (target) {
        cursor.classList.remove('hovering', 'has-label');
        cursor.querySelector('.cursor-label').textContent = '';
      }
    }, { passive: true });
  } else if (cursor) {
    cursor.style.display = 'none';
    document.body.style.cursor = 'auto';
  }

  // ========================================================================
  // Magnetic Buttons
  // ========================================================================
  if (!isTouch && !prefersReducedMotion) {
    document.querySelectorAll('.magnetic-btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
      }, { passive: true });
    });
  }

  // ========================================================================
  // Mobile Menu
  // ========================================================================
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
      mobileMenuToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ========================================================================
  // Project Detail Modal
  // ========================================================================
  const projectData = {
    rag: {
      category: 'FLAGSHIP PROJECT',
      title: 'GitHub Repo AI RAG Assistant',
      year: '2026',
      number: 'P—01',
      desc: 'A full-stack intelligent repository analyzer built in Java & Spring Boot using Retrieval-Augmented Generation (RAG). The system automatically clones and vector-indexes entire GitHub codebases, allowing developers to ask any technical question about repository architecture, logic, or dependencies and get accurate, context-aware answers.',
      techs: ['Java', 'Spring Boot', 'RAG & LLM', 'GitHub API', 'Vector Search']
    },
    firmware: {
      category: 'EMBEDDED & C',
      title: 'Microcontroller Firmware & Hardware Controller',
      year: '2025',
      number: 'P—02',
      desc: 'Engineered low-level C firmware for microcontroller units focusing on real-time sensor polling, GPIO interrupt routines, and power-optimized hardware peripheral communication over serial buses.',
      techs: ['Embedded C', 'Microcontrollers', 'Firmware', 'Hardware Protocols']
    },
    telemetry: {
      category: 'PYTHON & SYSTEMS',
      title: 'Automated Telemetry & Hardware Diagnostic Suite',
      year: '2025',
      number: 'P—03',
      desc: 'Developed an automated Python processing tool to parse serial log outputs, decode binary packet telemetry from hardware boards, and generate diagnostic reports for systems validation.',
      techs: ['Python', 'Automation', 'Data Processing', 'Diagnostics']
    }
  };

  const projectModal = document.getElementById('project-modal');
  const closeProjectModalBtn = document.getElementById('close-project-modal');

  function openProjectModal(projectId) {
    const data = projectData[projectId];
    if (!data || !projectModal) return;

    document.getElementById('pm-category').textContent = data.category;
    document.getElementById('pm-title').textContent = data.title;
    document.getElementById('pm-year').textContent = data.year;
    document.getElementById('pm-number').textContent = data.number;
    document.getElementById('pm-desc').textContent = data.desc;

    const techsContainer = document.getElementById('pm-techs');
    techsContainer.innerHTML = '';
    data.techs.forEach(tech => {
      const pill = document.createElement('span');
      pill.className = 'skill-pill';
      pill.textContent = tech;
      techsContainer.appendChild(pill);
    });

    projectModal.classList.add('active');
  }

  // Project card click
  document.querySelectorAll('[data-project]').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't intercept if clicking a link inside
      if (e.target.closest('a')) return;
      const projectId = card.getAttribute('data-project');
      openProjectModal(projectId);
    });
  });

  if (closeProjectModalBtn) {
    closeProjectModalBtn.addEventListener('click', () => {
      projectModal.classList.remove('active');
    });
  }

  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) projectModal.classList.remove('active');
    });
  }

  // ========================================================================
  // Showreel Modal (PRESERVED)
  // ========================================================================
  const showreelModal = document.getElementById('showreel-modal');
  const showreelBtn = document.getElementById('btn-showreel');
  const closeShowreelBtn = document.getElementById('close-showreel');
  const resumeBtn = document.getElementById('resume-scrub');

  function openShowreel(e) {
    if (e) e.preventDefault();
    if (showreelModal) showreelModal.classList.add('active');
  }

  function closeShowreel() {
    if (showreelModal) showreelModal.classList.remove('active');
  }

  if (showreelBtn) showreelBtn.addEventListener('click', openShowreel);
  if (closeShowreelBtn) closeShowreelBtn.addEventListener('click', closeShowreel);
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      closeShowreel();
      window.scrollBy({ top: 400, behavior: 'smooth' });
    });
  }

  if (showreelModal) {
    showreelModal.addEventListener('click', (e) => {
      if (e.target === showreelModal) closeShowreel();
    });
  }

  // ========================================================================
  // Escape Key — Close Any Open Modal
  // ========================================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
        modal.classList.remove('active');
      });
    }
  });

  // ========================================================================
  // Mouse Parallax on Decorative Layers
  // ========================================================================
  if (!isTouch && !prefersReducedMotion) {
    const heroTag = document.querySelector('.hero-bottom-right-tag');
    const heroVertical = document.querySelector('.hero-vertical-text');

    if (heroTag || heroVertical) {
      let mouseX = 0, mouseY = 0;

      document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });

      function parallaxTick() {
        if (heroTag) {
          heroTag.style.transform = `translate(${mouseX * -6}px, ${mouseY * -6}px)`;
        }
        if (heroVertical) {
          heroVertical.style.transform = `translateY(-50%) rotate(180deg) translate(${mouseX * 4}px, ${mouseY * 4}px)`;
        }
        requestAnimationFrame(parallaxTick);
      }
      parallaxTick();
    }
  }

  // ========================================================================
  // Terminal Typing Effect
  // ========================================================================
  function initTerminalEffect() {
    const terminalBlock = document.querySelector('.terminal-block');
    if (!terminalBlock) return;

    const terminalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lines = terminalBlock.querySelectorAll('.t-output');
          lines.forEach((line, i) => {
            line.style.opacity = '0';
            line.style.transform = 'translateX(-10px)';
            line.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

            setTimeout(() => {
              line.style.opacity = '1';
              line.style.transform = 'translateX(0)';
            }, 300 + i * 200);
          });
          terminalObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    terminalObserver.observe(terminalBlock);
  }

  // ========================================================================
  // Init
  // ========================================================================
  resizeCanvas();
  preloadImages();
  updateScrollTarget();
  updateNavbarState();
  requestAnimationFrame(tick);
  initArchitectureAnimation();
  initTerminalEffect();
})();
