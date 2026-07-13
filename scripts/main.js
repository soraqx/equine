function initMobileMenu() {
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!mobileMenuButton || !mobileMenu) return;

  mobileMenuButton.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden', !isHidden);
    mobileMenuButton.setAttribute('aria-expanded', String(isHidden));
  });
}

document.addEventListener('DOMContentLoaded', initMobileMenu);
window.initMobileMenu = initMobileMenu;
