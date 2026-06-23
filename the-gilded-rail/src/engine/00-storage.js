/* Storage shim. Loaded first (see index.html).
   Persistence goes through window.storage, an async key/value store:
       await window.storage.get(key)              -> null | { value: string }
       await window.storage.set(key, valueString) -> any
   Installs a localStorage-backed version only if one isn't already present, so a
   pre-provided store or the headless test stub is left untouched. To move to
   IndexedDB or a server later, swap the object below and keep the get/set contract. */
(function(){
  if (typeof window === 'undefined') return;
  if (window.storage && typeof window.storage.get === 'function') return;  // already provided

  const mem = {};                         // fallback when even localStorage is unavailable (private mode, etc.)
  const hasLS = (function(){ try { const k='__gr_test__'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; } catch(e){ return false; } })();

  window.storage = {
    async get(key){
      try {
        const v = hasLS ? localStorage.getItem(key) : (key in mem ? mem[key] : null);
        return (v === null || v === undefined) ? null : { value: v };
      } catch(e){ return null; }
    },
    async set(key, value){
      try { if (hasLS) localStorage.setItem(key, value); else mem[key] = value; } catch(e){}
      return {};
    },
    async remove(key){
      try { if (hasLS) localStorage.removeItem(key); else delete mem[key]; } catch(e){}
      return {};
    }
  };
})();
