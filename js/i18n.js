class I18n {
  constructor() {
    this.currentLanguage = localStorage.getItem('preferredLanguage') || 'fr';
    this.subscribers = [];
  }

  setLanguage(lang) {
    if (!window.translations[lang]) return;
    this.currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    
    // Update document direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // Update document title (strip HTML from title)
    const rawTitle = this.t('title').replace(/<[^>]*>?/gm, '');
    document.title = `${rawTitle} | ${this.t('tagline')}`;
    
    this.updateDOM();
    this.notifySubscribers();
  }

  t(path) {
    const keys = path.split('.');
    let result = window.translations[this.currentLanguage];
    for (const key of keys) {
      if (result[key] === undefined) return path;
      result = result[key];
    }
    return result;
  }

  updateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const path = el.getAttribute('data-i18n');
      const translation = this.t(path);
      
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    });

    // Update placeholders
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const path = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(path);
    });
    
    // Update tooltips/titles
    const titledElements = document.querySelectorAll('[data-i18n-title]');
    titledElements.forEach(el => {
      const path = el.getAttribute('data-i18n-title');
      el.title = this.t(path);
    });
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.currentLanguage));
  }
}

window.i18n = new I18n();
