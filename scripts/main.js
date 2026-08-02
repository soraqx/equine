/**
 * Fetches and inserts static section files declared with data-include.
 * Only simple section names are accepted so a page cannot request arbitrary paths.
 */
async function injectSections() {
  const placeholders = document.querySelectorAll('[data-include]');

  await Promise.all([...placeholders].map(async (placeholder) => {
    const sectionName = placeholder.dataset.include;

    if (!sectionName || !/^[a-z0-9][a-z0-9-]*$/i.test(sectionName)) {
      console.error('Invalid section name:', sectionName);
      placeholder.replaceWith(createSectionError());
      return;
    }

    try {
      const response = await fetch(`sections/${sectionName}.html`, {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Unable to load sections/${sectionName}.html (${response.status})`);
      }

      // Section files are first-party, version-controlled HTML. A template lets us
      // replace the placeholder with every top-level node from the fetched file.
      const template = document.createElement('template');
      template.innerHTML = await response.text();
      placeholder.replaceWith(template.content);
    } catch (error) {
      console.error(error);
      placeholder.replaceWith(createSectionError());
    }
  }));
}

function createSectionError() {
  const message = document.createElement('p');
  message.className = 'mx-auto max-w-7xl px-4 py-4 text-sm text-red-700 sm:px-6 lg:px-8';
  message.setAttribute('role', 'alert');
  message.textContent = 'This section is temporarily unavailable. Please refresh and try again.';
  return message;
}

function initMobileMenu() {
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!mobileMenuButton || !mobileMenu || mobileMenuButton.dataset.initialized) return;

  mobileMenuButton.dataset.initialized = 'true';
  mobileMenuButton.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden', !isHidden);
    mobileMenuButton.setAttribute('aria-expanded', String(isHidden));
  });

  mobileMenu.addEventListener('click', (event) => {
    if (!event.target.closest('a[href^="#"]')) return;
    mobileMenu.classList.add('hidden');
    mobileMenuButton.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Sends the contact form to a configured static-form provider without navigation.
 * Web3Forms access keys are public site identifiers; never place private API keys here.
 */
function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !status || !submitButton) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const endpoint = form.dataset.endpoint;
    if (!endpoint || !endpoint.startsWith('https://')) {
      setFormStatus(status, 'error', 'Contact form setup is incomplete. Please try again later.');
      return;
    }

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    setFormStatus(status, 'loading', 'Sending your message…');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'The form service rejected the request.');
      }

      form.reset();
      setFormStatus(status, 'success', 'Thanks — your message has been sent.');
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setFormStatus(status, 'error', 'We could not send your message. Please try again shortly.');
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });
}

/** Loads the selected professional profile or content module into the shared modal. */
function getModalElement() {
  return document.querySelector('.universal-modal, .profile-modal');
}

function closeProfileModal() {
  const modal = getModalElement();

  if (!modal || modal.hidden) return;

  modal.classList.remove('profile-modal--active');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;

  if (window.__equineVitalLastTrigger instanceof HTMLElement) {
    window.__equineVitalLastTrigger.focus();
    window.__equineVitalLastTrigger = null;
  }
}

function initProfileModals() {
  const modal = getModalElement();
  const content = modal?.querySelector('.universal-modal__content, .profile-modal__content');
  const closeButton = modal?.querySelector('.universal-modal__close, .profile-modal__close');
  const profileCards = document.querySelectorAll('.partner-card');
  let lastTrigger = null;

  if (!modal || !content || !closeButton) return;

  const closeModal = () => {
    closeProfileModal();
    lastTrigger?.focus();
  };

  const openModal = async (targetPath, trigger, subject = '') => {
    if (!targetPath || targetPath.includes('..') || /[<>]/.test(targetPath)) return;

    lastTrigger = trigger;
    window.__equineVitalLastTrigger = trigger;
    content.replaceChildren(createProfileMessage('Loading content…'));
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => modal.classList.add('profile-modal--active'));
    closeButton.focus();

    try {
      const response = await fetch(targetPath, {
        credentials: 'same-origin',
      });

      if (!response.ok) throw new Error(`Modal content request failed (${response.status})`);

      const template = document.createElement('template');
      template.innerHTML = await response.text();
      const fragment = template.content;

      if (subject) {
        const subjectInput = fragment.querySelector('#form-subject');
        if (subjectInput) subjectInput.value = subject;
      }

      content.replaceChildren(fragment);
    } catch (error) {
      console.error('Unable to load modal content:', error);
      content.replaceChildren(createProfileMessage('This content is not available yet. Please contact our team for more information.', true));
    }
  };

  profileCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      event.preventDefault();
      openModal(`sections/profiles/${card.dataset.profile}.html`, card);
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('button[data-modal-target], a[data-modal-target]');
    if (!trigger) return;

    event.preventDefault();
    openModal(trigger.dataset.modalTarget, trigger, trigger.dataset.subject || '');
  });

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

function createProfileMessage(message, isError = false) {
  const paragraph = document.createElement('p');
  paragraph.className = isError ? 'profile-modal__message profile-modal__message--error' : 'profile-modal__message';
  paragraph.setAttribute('role', isError ? 'alert' : 'status');
  paragraph.textContent = message;
  return paragraph;
}

function setFormStatus(element, state, message) {
  element.hidden = false;
  element.className = state === 'success'
    ? 'sm:col-span-2 text-sm text-green-700'
    : state === 'error'
      ? 'sm:col-span-2 text-sm text-red-700'
      : 'sm:col-span-2 text-sm text-slate-600';
  element.textContent = message;
}

document.addEventListener('DOMContentLoaded', async () => {
  await injectSections();
  initMobileMenu();
  initContactForm();
  initProfileModals();
});
