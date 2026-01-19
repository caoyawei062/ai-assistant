// DOM 操作工具函数

/**
 * 等待元素出现
 */
export function waitForElement(
  selector: string,
  timeout = 10000,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * 查找最近的匹配元素
 */
export function findClosest(
  element: HTMLElement,
  selector: string,
): HTMLElement | null {
  return element.closest(selector);
}

/**
 * 查找所有匹配的元素
 */
export function findAll(
  selector: string,
  parent: HTMLElement | Document = document,
): HTMLElement[] {
  var elements = parent.querySelectorAll(selector);
  var result = [];
  for (var i = 0; i < elements.length; i++) {
    result.push(elements[i] as HTMLElement);
  }
  return result;
}

/**
 * 创建带样式的元素
 */
export function createElement(
  tag: string,
  options: {
    className?: string;
    id?: string;
    text?: string;
    html?: string;
    attributes?: Record<string, string>;
    styles?: Record<string, string>;
  } = {},
): HTMLElement {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.id) {
    element.id = options.id;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.html) {
    element.innerHTML = options.html;
  }

  if (options.attributes) {
    for (var key in options.attributes) {
      if (options.attributes.hasOwnProperty(key)) {
        element.setAttribute(key, options.attributes[key]);
      }
    }
  }

  if (options.styles) {
    for (var key in options.styles) {
      if (options.styles.hasOwnProperty(key)) {
        (element.style as any)[key] = options.styles[key];
      }
    }
  }

  return element;
}

/**
 * 滚动到元素
 */
export function scrollToElement(
  element: HTMLElement,
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "center" },
): void {
  element.scrollIntoView(options);
}

/**
 * 高亮元素
 */
export function highlightElement(element: HTMLElement, duration = 2000): void {
  const originalStyle = element.style.cssText;
  element.style.transition = "background-color 0.3s";
  element.style.backgroundColor = "rgba(255, 255, 0, 0.3)";

  setTimeout(() => {
    element.style.backgroundColor = "";
    setTimeout(() => {
      element.style.cssText = originalStyle;
    }, 300);
  }, duration);
}

/**
 * 检查元素是否在视口中
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
