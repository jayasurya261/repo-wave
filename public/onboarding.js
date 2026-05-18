/**
 * onboarding.js — First-visit user walkthrough
 * Shows a 3-step modal explaining Repo Wave features
 */

const ONBOARDING_KEY = 'rw_onboarding_v1';
const EXCLUDED_PATHS = ['/login', '/profile'];

let currentStep = 0;

const steps = [
  {
    title: "🔍 Discover Open Source",
    description: "Find beginner-friendly issues in 5000+ repositories. Filter by language, difficulty, and recency to match your skill level.",
    cta: "Browse Issues →"
  },
  {
    title: "⭐ Earn Points",
    description: "Submit your merged PRs to earn points based on impact, quality, and difficulty. Build your public contribution graph and showcase your work.",
    cta: "See Scoring Details"
  },
  {
    title: "👤 Get Started",
    description: "Sign in with GitHub to track your contributions and save your favorite repositories. Start building your dev portfolio today.",
    cta: "Sign In"
  }
];

function showOnboarding(initialStep = 0) {
  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;

  currentStep = initialStep;
  overlay.classList.remove('hidden');
  renderStep();
}

function dismissOnboarding() {
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
  localStorage.setItem(ONBOARDING_KEY, 'shown');
}

function nextStep() {
  if (currentStep < steps.length - 1) {
    currentStep++;
    renderStep();
  } else {
    dismissOnboarding();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}

function renderStep() {
  const step = steps[currentStep];
  const container = document.getElementById('onboardingSteps');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center">
      <div class="text-4xl mb-4">${step.title.split(' ')[0]}</div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">${step.title.replace(/^[^\s]+ /, '')}</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">${step.description}</p>
      <button id="onboardingMainCta" class="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
        ${step.cta}
      </button>
    </div>
  `;

  // Attach CTA handler
  const ctaBtn = document.getElementById('onboardingMainCta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', handleCTA);
  }

  // Update step indicator
  const indicator = document.getElementById('onboardingIndicator');
  if (indicator) {
    indicator.innerHTML = `
      <div class="flex gap-2 justify-center">
        ${steps.map((_, i) => `
          <div class="h-2 w-2 rounded-full transition-colors ${i === currentStep ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}"></div>
        `).join('')}
      </div>
    `;
  }

  // Update button states
  const prevBtn = document.getElementById('onboardingPrev');
  const nextBtn = document.getElementById('onboardingNext');
  if (prevBtn) prevBtn.disabled = currentStep === 0;
  if (nextBtn) {
    if (currentStep === steps.length - 1) {
      nextBtn.textContent = 'Done';
    } else {
      nextBtn.textContent = 'Next';
    }
  }
}

function handleCTA() {
  if (currentStep === 0) {
    // Step 1: Browse Issues
    dismissOnboarding();
    window.location.href = '/issues';
  } else if (currentStep === 1) {
    // Step 2: Show scoring details
    nextStep();
  } else if (currentStep === 2) {
    // Step 3: Sign in
    dismissOnboarding();
    window.location.href = '/login';
  }
}

function init() {
  const helpBtn = document.getElementById('onboardingHelpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => showOnboarding());
  }

  const prevBtn = document.getElementById('onboardingPrev');
  if (prevBtn) {
    prevBtn.addEventListener('click', prevStep);
  }

  const nextBtn = document.getElementById('onboardingNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentStep === steps.length - 1) {
        dismissOnboarding();
      } else {
        nextStep();
      }
    });
  }

  // Auto-show on first visit (but not on excluded paths)
  const isExcludedPath = EXCLUDED_PATHS.some(path => window.location.pathname.includes(path));
  if (!localStorage.getItem(ONBOARDING_KEY) && !isExcludedPath) {
    setTimeout(() => showOnboarding(), 500);
  }
}

// Support both hard page loads and Astro ClientRouter soft navigation
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('astro:page-load', init);
