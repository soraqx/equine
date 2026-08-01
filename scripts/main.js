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
});
