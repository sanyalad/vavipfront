import { useState, useRef, useCallback, useEffect } from 'react';
import { gsap } from 'gsap';

interface UseVideoStackOptions {
  totalSections: number;
}

interface UseVideoStackReturn {
  activeIndex: number;
  direction: 'next' | 'prev' | null;
  isAnimating: boolean;
  isFooterOpen: boolean;
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  footerRef: React.RefObject<HTMLDivElement | null>;
  goToSection: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  openFooter: () => void;
  closeFooter: () => void;
}

export const useVideoStack = ({
  totalSections,
}: UseVideoStackOptions): UseVideoStackReturn => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFooterOpen, setIsFooterOpen] = useState(false);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const activeIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const isFooterOpenRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    isFooterOpenRef.current = isFooterOpen;
  }, [isFooterOpen]);

  // Initialize section positions
  useEffect(() => {
    // Wait for all sections to be mounted
    const initTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        sectionRefs.current.forEach((section, i) => {
          if (!section) return;

          gsap.set(section, { clearProps: 'all' });

          if (i === 0) {
            gsap.set(section, {
              yPercent: 0,
              zIndex: 3,
              visibility: 'visible',
            });
          } else if (i === 1) {
            gsap.set(section, {
              yPercent: 100,
              zIndex: 5,
              visibility: 'visible',
            });
          } else {
            gsap.set(section, {
              yPercent: 100,
              zIndex: 0,
              visibility: 'hidden',
            });
          }
        });
      });
    }, 100);

    return () => clearTimeout(initTimer);
  }, []);

  const updateSectionStates = useCallback((newActiveIndex: number) => {
    sectionRefs.current.forEach((section, i) => {
      if (!section) return;

      // Always reset will-change first
      section.style.willChange = 'auto';

      if (i === newActiveIndex) {
        gsap.set(section, { 
          zIndex: 3, 
          visibility: 'visible', 
          yPercent: 0,
          opacity: 1,
          clearProps: 'filter'
        });
      } else if (i === newActiveIndex + 1) {
        gsap.set(section, { 
          zIndex: 5, 
          visibility: 'visible', 
          yPercent: 100,
          opacity: 1,
          clearProps: 'filter'
        });
      } else if (i === newActiveIndex - 1) {
        gsap.set(section, { 
          zIndex: 1, 
          visibility: 'visible', 
          yPercent: -100,
          opacity: 1,
          clearProps: 'filter'
        });
      } else {
        gsap.set(section, { 
          zIndex: 0, 
          visibility: 'hidden', 
          yPercent: i < newActiveIndex ? -100 : 100,
          clearProps: 'filter'
        });
      }
    });
  }, []);


  const snapToSection = useCallback((targetIndex: number, fromPercent: number, dir: 'up' | 'down') => {
    if (targetIndex < 0 || targetIndex >= totalSections) return;

    const movingSection = sectionRefs.current[dir === 'down' ? targetIndex : activeIndexRef.current];
    if (!movingSection) return;

    setIsAnimating(true);
    setDirection(dir);

    movingSection.style.willChange = 'transform';

    const targetPercent = dir === 'down' ? 0 : 100;

    gsap.to(movingSection, {
      yPercent: targetPercent,
      duration: 0.5,
      ease: 'power3.out',
      force3D: true,
      onComplete: () => {
        movingSection.style.willChange = 'auto';
        
        if (dir === 'down') {
          setActiveIndex(targetIndex);
          activeIndexRef.current = targetIndex;
        }
        
        updateSectionStates(dir === 'down' ? targetIndex : activeIndexRef.current);
        setIsAnimating(false);
        setDirection(null);
      },
    });
  }, [totalSections, updateSectionStates]);

  const snapBack = useCallback((section: HTMLElement, dir: 'up' | 'down') => {
    setIsAnimating(true);
    section.style.willChange = 'transform';

    const targetPercent = dir === 'down' ? 100 : -100;

    gsap.to(section, {
      yPercent: targetPercent,
      duration: 0.4,
      ease: 'power3.out',
      force3D: true,
      onComplete: () => {
        section.style.willChange = 'auto';
        updateSectionStates(activeIndexRef.current);
        setIsAnimating(false);
        setDirection(null);
      },
    });
  }, [updateSectionStates]);

  const openFooter = useCallback(() => {
    if (isFooterOpenRef.current || isAnimatingRef.current) return;

    setIsAnimating(true);
    setIsFooterOpen(true);
    isFooterOpenRef.current = true;

    const footer = document.querySelector('[data-footer]') as HTMLElement;
    const backdrop = document.querySelector('[data-footer-backdrop]') as HTMLElement;

    if (footer && backdrop) {
      // Ensure footer is visible and positioned correctly before animation
      // Clear any existing transforms and set initial state
      gsap.set(footer, {
        clearProps: 'transform',
        visibility: 'visible',
        opacity: 1,
        yPercent: 100, // Start from bottom (off-screen)
        zIndex: 1260,
        display: 'block',
      });
      
      // Force a reflow to ensure styles are applied
      footer.offsetHeight;
      
      gsap.timeline({ onComplete: () => setIsAnimating(false) })
        .to(backdrop, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
        .set(backdrop, { pointerEvents: 'auto' }, 0)
        .to(footer, { 
          yPercent: 0, // Slide up to visible position
          duration: 0.5, 
          ease: 'power3.out', 
          force3D: true,
          immediateRender: false,
        }, 0);
    } else {
      setIsAnimating(false);
    }
  }, []);

  const closeFooter = useCallback(() => {
    if (!isFooterOpenRef.current || isAnimatingRef.current) return;

    setIsAnimating(true);

    const footer = document.querySelector('[data-footer]') as HTMLElement;
    const backdrop = document.querySelector('[data-footer-backdrop]') as HTMLElement;

    if (footer && backdrop) {
      gsap.timeline({
        onComplete: () => {
          setIsFooterOpen(false);
          isFooterOpenRef.current = false;
          setIsAnimating(false);
        },
      })
        .to(footer, { yPercent: 100, duration: 0.4, ease: 'power3.in', force3D: true }, 0)
        .to(backdrop, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.1)
        .set(backdrop, { pointerEvents: 'none' });
    } else {
      setIsFooterOpen(false);
      isFooterOpenRef.current = false;
      setIsAnimating(false);
    }
  }, []);

  const goNext = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (activeIndexRef.current === totalSections - 1) {
      openFooter();
      return;
    }
    snapToSection(activeIndexRef.current + 1, 100, 'down');
  }, [totalSections, openFooter, snapToSection]);

  const goPrev = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (isFooterOpenRef.current) {
      closeFooter();
      return;
    }
    if (activeIndexRef.current === 0) return;
    
    const prevSection = sectionRefs.current[activeIndexRef.current - 1];
    if (prevSection) {
      gsap.set(prevSection, { yPercent: -100, zIndex: 5, visibility: 'visible' });
    }
    snapToSection(activeIndexRef.current - 1, -100, 'up');
  }, [closeFooter, snapToSection]);

  const goToSection = useCallback((index: number) => {
    if (index === activeIndexRef.current) return;
    const dir = index > activeIndexRef.current ? 'down' : 'up';
    
    if (dir === 'down') {
      snapToSection(index, 100, 'down');
    } else {
      const targetSection = sectionRefs.current[index];
      if (targetSection) {
        gsap.set(targetSection, { yPercent: -100, zIndex: 5, visibility: 'visible' });
      }
      snapToSection(index, -100, 'up');
    }
  }, [snapToSection]);

  // Interactive trackpad/wheel handling
  useEffect(() => {
    const SNAP_THRESHOLD = 0.25; // 25% = commit to transition
    const VELOCITY_THRESHOLD = 8; // High velocity = commit regardless of position
    
    let dragProgress = 0; // 0 to 1 (or -1)
    let velocity = 0;
    let lastDelta = 0;
    let lastTime = 0;
    let isDragging = false;
    let dragDirection: 'up' | 'down' | null = null;
    let gestureTimeout: number | null = null;

    const getMovingSection = () => {
      if (dragDirection === 'down') {
        return sectionRefs.current[activeIndexRef.current + 1];
      } else if (dragDirection === 'up') {
        return sectionRefs.current[activeIndexRef.current];
      }
      return null;
    };

    const updateSectionPosition = (progress: number) => {
      const section = getMovingSection();
      if (!section) return;

      section.style.willChange = 'transform';

      if (dragDirection === 'down') {
        // Next section slides up from bottom (100% -> 0%)
        const yPercent = 100 - (progress * 100);
        gsap.set(section, { yPercent, zIndex: 5, visibility: 'visible' });
      } else if (dragDirection === 'up') {
        // Current section slides down (0% -> 100%)
        const yPercent = progress * 100;
        gsap.set(section, { yPercent, zIndex: 5, visibility: 'visible' });
        
        // Show previous section behind
        const prevSection = sectionRefs.current[activeIndexRef.current - 1];
        if (prevSection) {
          gsap.set(prevSection, { yPercent: 0, zIndex: 3, visibility: 'visible' });
        }
      }
    };

    const finishGesture = () => {
      if (!isDragging || isAnimatingRef.current) {
        reset();
        return;
      }

      const section = getMovingSection();
      if (!section) {
        reset();
        return;
      }

      const shouldCommit = Math.abs(dragProgress) > SNAP_THRESHOLD || Math.abs(velocity) > VELOCITY_THRESHOLD;

      if (shouldCommit && dragDirection) {
        if (dragDirection === 'down') {
          // Commit to next section
          setIsAnimating(true);
          setDirection('down');
          
          gsap.to(section, {
            yPercent: 0,
            duration: 0.4,
            ease: 'power3.out',
            force3D: true,
            onComplete: () => {
              section.style.willChange = 'auto';
              const newIndex = activeIndexRef.current + 1;
              setActiveIndex(newIndex);
              activeIndexRef.current = newIndex;
              updateSectionStates(newIndex);
              setIsAnimating(false);
              setDirection(null);
            },
          });
        } else {
          // Commit to prev section
          setIsAnimating(true);
          setDirection('up');
          
          gsap.to(section, {
            yPercent: 100,
            duration: 0.4,
            ease: 'power3.out',
            force3D: true,
            onComplete: () => {
              section.style.willChange = 'auto';
              const newIndex = activeIndexRef.current - 1;
              setActiveIndex(newIndex);
              activeIndexRef.current = newIndex;
              updateSectionStates(newIndex);
              setIsAnimating(false);
              setDirection(null);
            },
          });
        }
      } else {
        // Snap back
        setIsAnimating(true);
        
        const targetPercent = dragDirection === 'down' ? 100 : 0;
        
        gsap.to(section, {
          yPercent: targetPercent,
          duration: 0.3,
          ease: 'power3.out',
          force3D: true,
          onComplete: () => {
            section.style.willChange = 'auto';
            updateSectionStates(activeIndexRef.current);
            setIsAnimating(false);
            setDirection(null);
          },
        });
      }

      reset();
    };

    const reset = () => {
      dragProgress = 0;
      velocity = 0;
      lastDelta = 0;
      isDragging = false;
      dragDirection = null;
      if (gestureTimeout) {
        clearTimeout(gestureTimeout);
        gestureTimeout = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Check if dropdown is open - if so, don't handle wheel events
      // (let dropdown handle scrolling instead)
      const target = e.target as HTMLElement | null
      
      // Check if body has dropdown-scroll-lock class (indicates dropdown is open)
      const isDropdownOpen = document.body.classList.contains('dropdown-scroll-lock')
      
      if (isDropdownOpen && target) {
        // Find dropdown panel by traversing up the DOM tree
        let element: HTMLElement | null = target
        while (element && element !== document.body) {
          const style = getComputedStyle(element)
          // Check if this is the dropdown panel (fixed position, overflow-y: auto, visible)
          if (style.position === 'fixed' && 
              style.overflowY === 'auto' && 
              parseFloat(style.opacity) > 0.5) {
            // Inside dropdown - let it scroll, don't prevent
            return
          }
          element = element.parentElement
        }
        // Outside dropdown - prevent page scroll (dropdown handler will block it)
        e.preventDefault()
        return
      }

      e.preventDefault();

      if (isAnimatingRef.current) return;

      const now = performance.now();
      const dt = lastTime ? now - lastTime : 16;
      lastTime = now;

      const delta = e.deltaY;
      const isTrackpad = e.deltaMode === 0 && Math.abs(delta) < 80;

      if (!isTrackpad) {
        // Mouse wheel: immediate navigation
        if (delta > 0) {
          if (activeIndexRef.current < totalSections - 1) {
            goNext();
          } else {
            openFooter();
          }
        } else if (delta < 0) {
          if (isFooterOpenRef.current) {
            closeFooter();
          } else {
            goPrev();
          }
        }
        return;
      }

      // Trackpad: interactive dragging
      if (gestureTimeout) {
        clearTimeout(gestureTimeout);
      }

      // Detect gesture start or direction change
      if (!isDragging) {
        // Check footer first
        if (isFooterOpenRef.current) {
          if (delta < 0) {
            closeFooter();
          }
          return;
        }
        
        if (delta > 0 && activeIndexRef.current < totalSections - 1) {
          isDragging = true;
          dragDirection = 'down';
          dragProgress = 0;
          
          // Prepare next section
          const nextSection = sectionRefs.current[activeIndexRef.current + 1];
          if (nextSection) {
            gsap.set(nextSection, { yPercent: 100, zIndex: 5, visibility: 'visible' });
          }
        } else if (delta < 0 && activeIndexRef.current > 0) {
          isDragging = true;
          dragDirection = 'up';
          dragProgress = 0;
          
          // Prepare prev section behind current
          const prevSection = sectionRefs.current[activeIndexRef.current - 1];
          if (prevSection) {
            gsap.set(prevSection, { yPercent: 0, zIndex: 3, visibility: 'visible' });
          }
        } else if (delta > 0 && activeIndexRef.current === totalSections - 1) {
          // On last section, scroll down opens footer
          openFooter();
          return;
        }
      }

      if (isDragging && dragDirection) {
        // Calculate velocity (px/ms)
        velocity = delta / Math.max(dt, 1);
        lastDelta = delta;

        // Convert delta to progress (screen height = 100%)
        const screenHeight = window.innerHeight;
        const deltaProgress = (delta / screenHeight) * 2; // Multiplier for sensitivity

        if (dragDirection === 'down') {
          dragProgress = Math.max(0, Math.min(1, dragProgress + deltaProgress));
        } else {
          dragProgress = Math.max(0, Math.min(1, dragProgress - deltaProgress));
        }

        updateSectionPosition(dragProgress);
      }

      // Schedule gesture end detection
      gestureTimeout = window.setTimeout(() => {
        finishGesture();
      }, 100);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (gestureTimeout) clearTimeout(gestureTimeout);
    };
  }, [totalSections, goNext, goPrev, openFooter, closeFooter, updateSectionStates]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimatingRef.current) return;

      switch (e.key) {
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          if (isFooterOpenRef.current) {
            closeFooter();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, closeFooter]);

  // Touch handling with interactive drag
  useEffect(() => {
    const SNAP_THRESHOLD = 0.25;
    const VELOCITY_THRESHOLD = 0.5;
    
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isDragging = false;
    let dragDirection: 'up' | 'down' | null = null;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (isAnimatingRef.current) return;
      
      touchStartY = e.touches[0].clientY;
      touchCurrentY = touchStartY;
      startTime = Date.now();
      isDragging = false;
      dragDirection = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isAnimatingRef.current) return;

      touchCurrentY = e.touches[0].clientY;
      const diff = touchStartY - touchCurrentY;
      const screenHeight = window.innerHeight;
      const progress = Math.abs(diff) / screenHeight;

      // Detect direction on first significant movement
      if (!isDragging && Math.abs(diff) > 10) {
        if (diff > 0 && activeIndexRef.current < totalSections - 1) {
          isDragging = true;
          dragDirection = 'down';
          
          const nextSection = sectionRefs.current[activeIndexRef.current + 1];
          if (nextSection) {
            nextSection.style.willChange = 'transform';
            gsap.set(nextSection, { yPercent: 100, zIndex: 5, visibility: 'visible' });
          }
        } else if (diff < 0 && activeIndexRef.current > 0) {
          isDragging = true;
          dragDirection = 'up';
          
          const currentSection = sectionRefs.current[activeIndexRef.current];
          const prevSection = sectionRefs.current[activeIndexRef.current - 1];
          if (currentSection) {
            currentSection.style.willChange = 'transform';
          }
          if (prevSection) {
            gsap.set(prevSection, { yPercent: 0, zIndex: 3, visibility: 'visible' });
          }
        } else if (diff > 0 && activeIndexRef.current === totalSections - 1) {
          openFooter();
          return;
        }
      }

      if (isDragging && dragDirection) {
        e.preventDefault();
        
        if (dragDirection === 'down') {
          const nextSection = sectionRefs.current[activeIndexRef.current + 1];
          if (nextSection) {
            const yPercent = Math.max(0, 100 - (progress * 100));
            gsap.set(nextSection, { yPercent });
          }
        } else {
          const currentSection = sectionRefs.current[activeIndexRef.current];
          if (currentSection) {
            const yPercent = Math.min(100, progress * 100);
            gsap.set(currentSection, { yPercent });
          }
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging || isAnimatingRef.current) return;

      const diff = touchStartY - touchCurrentY;
      const screenHeight = window.innerHeight;
      const progress = Math.abs(diff) / screenHeight;
      const duration = Date.now() - startTime;
      const velocity = Math.abs(diff) / duration;

      const shouldCommit = progress > SNAP_THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (shouldCommit && dragDirection) {
        if (dragDirection === 'down') {
          const nextSection = sectionRefs.current[activeIndexRef.current + 1];
          if (nextSection) {
            setIsAnimating(true);
            setDirection('down');
            
            gsap.to(nextSection, {
              yPercent: 0,
              duration: 0.4,
              ease: 'power3.out',
              force3D: true,
              onComplete: () => {
                nextSection.style.willChange = 'auto';
                const newIndex = activeIndexRef.current + 1;
                setActiveIndex(newIndex);
                activeIndexRef.current = newIndex;
                updateSectionStates(newIndex);
                setIsAnimating(false);
                setDirection(null);
              },
            });
          }
        } else {
          const currentSection = sectionRefs.current[activeIndexRef.current];
          if (currentSection) {
            setIsAnimating(true);
            setDirection('up');
            
            gsap.to(currentSection, {
              yPercent: 100,
              duration: 0.4,
              ease: 'power3.out',
              force3D: true,
              onComplete: () => {
                currentSection.style.willChange = 'auto';
                const newIndex = activeIndexRef.current - 1;
                setActiveIndex(newIndex);
                activeIndexRef.current = newIndex;
                updateSectionStates(newIndex);
                setIsAnimating(false);
                setDirection(null);
              },
            });
          }
        }
      } else {
        // Snap back
        const section = dragDirection === 'down' 
          ? sectionRefs.current[activeIndexRef.current + 1]
          : sectionRefs.current[activeIndexRef.current];
        
        if (section) {
          setIsAnimating(true);
          const targetPercent = dragDirection === 'down' ? 100 : 0;
          
          gsap.to(section, {
            yPercent: targetPercent,
            duration: 0.3,
            ease: 'power3.out',
            force3D: true,
            onComplete: () => {
              section.style.willChange = 'auto';
              updateSectionStates(activeIndexRef.current);
              setIsAnimating(false);
            },
          });
        }
      }

      isDragging = false;
      dragDirection = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [totalSections, openFooter, updateSectionStates]);

  return {
    activeIndex,
    direction: direction === 'up' ? 'prev' : direction === 'down' ? 'next' : null,
    isAnimating,
    isFooterOpen,
    sectionRefs,
    footerRef,
    goToSection,
    goNext,
    goPrev,
    openFooter,
    closeFooter,
  };
};

