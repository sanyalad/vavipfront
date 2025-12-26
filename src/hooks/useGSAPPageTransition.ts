// hooks/useGSAPPageTransition.ts
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export interface UseGSAPPageTransitionOptions {
  /** Длительность анимации появления в секундах */
  duration?: number;
  /** Easing функция */
  ease?: string;
  /** Задержка перед анимацией в секундах */
  delay?: number;
  /** Начальная прозрачность */
  fromOpacity?: number;
  /** Конечная прозрачность */
  toOpacity?: number;
  /** Начальное смещение по Y */
  fromY?: number;
  /** Конечное смещение по Y */
  toY?: number;
  /** Начальное смещение по X */
  fromX?: number;
  /** Конечное смещение по X */
  toX?: number;
  /** Начальный scale */
  fromScale?: number;
  /** Конечный scale */
  toScale?: number;
  /** Включить анимацию при монтировании */
  animateOnMount?: boolean;
}

/**
 * Хук для плавных page transitions с использованием GSAP
 * Заменяет Framer Motion для лучшей производительности
 */
export function useGSAPPageTransition(
  elementRef: React.RefObject<HTMLElement>,
  options: UseGSAPPageTransitionOptions = {}
) {
  const {
    duration = 0.6,
    ease = 'power2.out',
    delay = 0,
    fromOpacity = 0,
    toOpacity = 1,
    fromY = 0,
    toY = 0,
    fromX = 0,
    toX = 0,
    fromScale = 1,
    toScale = 1,
    animateOnMount = true,
  } = options;

  const animationRef = useRef<gsap.core.Tween | null>(null);
  const hasAnimatedRef = useRef(false);
  const mountedRef = useRef(false);
  const interactionHandlersRef = useRef<Array<{ element: HTMLElement; handler: () => void; type: string }>>([]);

  useEffect(() => {
    // Защита от StrictMode: не сбрасываем hasAnimatedRef при cleanup
    if (mountedRef.current) {
      return;
    }
    
    mountedRef.current = true;
    
    if (!elementRef.current || !animateOnMount) {
      return;
    }

    if (hasAnimatedRef.current) {
      return;
    }

    const element = elementRef.current;
    
    // Ждем следующего фрейма, чтобы элемент был полностью отрендерен
    const rafId = requestAnimationFrame(() => {
      if (!elementRef.current || hasAnimatedRef.current) {
        return;
      }

      hasAnimatedRef.current = true;

      // Устанавливаем начальное состояние БЕЗ задержки
      const fromProps: gsap.TweenVars = {
        opacity: fromOpacity,
        force3D: true,
        immediateRender: true, // Применяем сразу для мгновенного старта
      };
      
      if (fromY !== toY) fromProps.y = fromY;
      if (fromX !== toX) fromProps.x = fromX;
      if (fromScale !== toScale) fromProps.scale = fromScale;
      
      gsap.set(element, fromProps);

      // Анимация появления - быстрая и прерываемая
      const toProps: gsap.TweenVars = {
        opacity: toOpacity,
        duration,
        delay,
        ease,
        force3D: true,
        // Важно: не блокируем pointer events
        pointerEvents: 'auto',
        onInterrupt: () => {
          // При прерывании возвращаем к финальной позиции и очищаем transform
          if (element) {
            // Селективная очистка только нужных свойств, чтобы не конфликтовать с жестами
            gsap.set(element, {
              clearProps: 'transform,opacity',
            });
            element.style.opacity = String(toOpacity);
            element.style.transform = '';
            element.style.pointerEvents = '';
          }
        },
        onComplete: () => {
          // После завершения анимации фиксируем финальную позицию и очищаем transform
          if (element) {
            // Селективная очистка только нужных свойств, чтобы не конфликтовать с жестами
            gsap.set(element, {
              clearProps: 'transform,opacity',
            });
            // Устанавливаем финальные значения через CSS
            element.style.opacity = String(toOpacity);
            element.style.transform = '';
            // Убеждаемся, что pointer-events работают
            element.style.pointerEvents = '';
          }
          animationRef.current = null;
        },
      };
      
      if (fromY !== toY) toProps.y = toY;
      if (fromX !== toX) toProps.x = toX;
      if (fromScale !== toScale) toProps.scale = toScale;

      animationRef.current = gsap.to(element, toProps);
      
      // Добавляем обработчик для прерывания при начале жеста
      const handleInteraction = () => {
        if (animationRef.current && animationRef.current.isActive()) {
          // Прерываем анимацию и сразу устанавливаем финальную позицию
          animationRef.current.kill();
          if (element) {
            // Селективная очистка только нужных свойств, чтобы не конфликтовать с жестами
            gsap.set(element, {
              clearProps: 'transform,opacity',
            });
            // Устанавливаем финальные значения
            element.style.opacity = String(toOpacity);
            element.style.transform = '';
            element.style.pointerEvents = '';
          }
          animationRef.current = null;
        }
      };
      
      // Слушаем события взаимодействия для прерывания анимации
      element.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
      element.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
      
      // Сохраняем обработчики для cleanup (хотя once: true означает автоматическое удаление)
      interactionHandlersRef.current.push(
        { element, handler: handleInteraction, type: 'pointerdown' },
        { element, handler: handleInteraction, type: 'touchstart' }
      );
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
      // Удаляем обработчики взаимодействия (хотя once: true уже удалил их)
      interactionHandlersRef.current.forEach(({ element: el, handler, type }) => {
        el.removeEventListener(type, handler);
      });
      interactionHandlersRef.current = [];
      
      // Убеждаемся, что элемент в финальной позиции при cleanup
      if (elementRef.current) {
        const el = elementRef.current;
        // Селективная очистка только нужных свойств, чтобы не конфликтовать с жестами
        gsap.set(el, {
          clearProps: 'transform,opacity',
        });
        // Устанавливаем финальные значения
        el.style.opacity = String(toOpacity);
        el.style.transform = '';
        el.style.pointerEvents = '';
      }
      // НЕ сбрасываем hasAnimatedRef здесь - это защита от StrictMode
      // mountedRef.current = false; // Тоже не сбрасываем, чтобы избежать повторной анимации
    };
  }, [elementRef, duration, ease, delay, fromOpacity, toOpacity, fromY, toY, fromX, toX, fromScale, toScale, animateOnMount]);

  // Функция для exit анимации (можно вызвать перед unmount)
  const exit = (onComplete?: () => void) => {
    if (!elementRef.current) {
      onComplete?.();
      return;
    }

    if (animationRef.current) {
      animationRef.current.kill();
    }

    const exitProps: gsap.TweenVars = {
      opacity: fromOpacity,
      duration: duration * 0.8, // Exit быстрее чем enter
      ease: 'power2.in',
      force3D: true,
      onComplete: () => {
        onComplete?.();
      },
    };
    
    if (fromY !== toY) exitProps.y = fromY;
    if (fromX !== toX) exitProps.x = fromX;
    if (fromScale !== toScale) exitProps.scale = fromScale;

    animationRef.current = gsap.to(elementRef.current, exitProps);
  };

  return { exit };
}

