/**
 * QASL-API-SENTINEL Landing Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tab functionality
  initTabs();

  // Mobile menu
  initMobileMenu();

  // Copy to clipboard
  initCopyButtons();

  // Smooth scroll
  initSmoothScroll();

  // Navbar scroll effect
  initNavbarScroll();

  // Animate on scroll
  initScrollAnimations();
});

/**
 * Initialize tab functionality for code examples
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');

      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      document.getElementById(tabId)?.classList.add('active');
    });
  });
}

/**
 * Initialize mobile menu toggle
 */
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active');
      navLinks.classList.toggle('mobile-open');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('active');
        navLinks.classList.remove('mobile-open');
      });
    });
  }
}

/**
 * Initialize copy to clipboard functionality
 */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const codeElement = button.previousElementSibling;
      const text = codeElement?.textContent || '';

      try {
        await navigator.clipboard.writeText(text);

        // Show feedback
        const originalText = button.textContent;
        button.textContent = '✓';
        button.style.color = '#22c55e';

        setTimeout(() => {
          button.textContent = originalText;
          button.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });
}

/**
 * Initialize smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80; // Account for fixed navbar
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Initialize navbar scroll effect
 */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      navbar.classList.remove('scroll-up');
      navbar.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
      return;
    }

    if (currentScroll > lastScroll && !navbar.classList.contains('scroll-down')) {
      // Scrolling down
      navbar.classList.remove('scroll-up');
      navbar.classList.add('scroll-down');
    } else if (currentScroll < lastScroll && navbar.classList.contains('scroll-down')) {
      // Scrolling up
      navbar.classList.remove('scroll-down');
      navbar.classList.add('scroll-up');
    }

    // Make navbar more opaque when scrolled
    if (currentScroll > 100) {
      navbar.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    } else {
      navbar.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
    }

    lastScroll = currentScroll;
  });
}

/**
 * Initialize scroll animations using Intersection Observer
 */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all animatable elements
  document.querySelectorAll('.feature-card, .compliance-card, .pricing-card, .section-header').forEach(el => {
    el.classList.add('animate-prepare');
    observer.observe(el);
  });
}

/**
 * Terminal typing effect (optional enhancement)
 */
function typeTerminalText(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }

  type();
}

/**
 * Add animation classes dynamically
 */
const style = document.createElement('style');
style.textContent = `
  .animate-prepare {
    opacity: 0;
    transform: translateY(30px);
  }

  .animate-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }

  .scroll-down {
    transform: translateY(-100%);
    transition: transform 0.3s ease-in-out;
  }

  .scroll-up {
    transform: translateY(0);
    transition: transform 0.3s ease-in-out;
  }

  .nav-links.mobile-open {
    display: flex !important;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.98);
    padding: 1rem;
    gap: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mobile-menu-btn.active span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }

  .mobile-menu-btn.active span:nth-child(2) {
    opacity: 0;
  }

  .mobile-menu-btn.active span:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
  }
`;
document.head.appendChild(style);

// Analytics tracking (placeholder)
function trackEvent(category, action, label) {
  // Implement your analytics tracking here
  console.log('Event:', { category, action, label });
}

// Track CTA clicks
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
  btn.addEventListener('click', () => {
    trackEvent('CTA', 'click', btn.textContent.trim());
  });
});
