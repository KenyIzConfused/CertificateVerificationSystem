var e=null,t=null;function n(){return e||(e=document.createElement(`div`),e.id=`popup-container`,e.className=`fixed inset-0 z-50 flex items-center justify-center p-4`,e.style.display=`none`,document.body.appendChild(e)),e}function r(){return t||(t=document.createElement(`div`),t.id=`app-loading-overlay`,t.className=`fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm`,t.style.display=`none`,t.innerHTML=`
      <div class="flex flex-col items-center gap-4">
        <div class="relative">
          <div class="w-12 h-12 border-[3px] border-green-100 rounded-full"></div>
          <div class="absolute inset-0 w-12 h-12 border-[3px] border-transparent border-t-green-600 border-r-green-600 rounded-full animate-spin"></div>
        </div>
        <p class="text-gray-700 font-semibold text-base tracking-wide">Loading, please wait...</p>
      </div>
    `,document.body.appendChild(t)),t}function i(e){t&&t.dataset.caller===e&&(t.style.display=`none`,t.dataset.caller=``)}function a(e){let t={success:{bg:`bg-green-50`,border:`border-green-200`,color:`text-green-600`,path:`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>`},error:{bg:`bg-red-50`,border:`border-red-200`,color:`text-red-600`,path:`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m4 0h-8m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>`},warning:{bg:`bg-amber-50`,border:`border-amber-200`,color:`text-amber-600`,path:`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`},info:{bg:`bg-blue-50`,border:`border-blue-200`,color:`text-blue-600`,path:`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`},confirm:{bg:`bg-green-50`,border:`border-green-200`,color:`text-green-600`,path:`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`}},n=t[e]||t.info;return`
    <div class="flex-shrink-0 w-12 h-12 rounded-xl ${n.bg} ${n.border} border flex items-center justify-center">
      <svg class="w-6 h-6 ${n.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${n.path}
      </svg>
    </div>
  `}function o(e){let t={success:`border-l-4 border-green-500`,error:`border-l-4 border-red-500`,warning:`border-l-4 border-amber-500`,info:`border-l-4 border-blue-500`,confirm:`border-l-4 border-green-500`};return t[e]||t.info}function s(e,t,n){return e.danger?`bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm hover:shadow-md`:e.primary?t===0&&n>1?`bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md`:`bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg hover:shadow-xl`:`bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md`}function c(t){let{type:r=`info`,title:i,message:c,buttons:l=[],autoClose:u=!1,duration:d=3e3}=t;n();let f=document.createElement(`div`);f.className=`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300`,f.style.opacity=`0`;let p=document.createElement(`div`);p.style.opacity=`0`,p.style.transform=`translate(-50%, -50%) scale(0.92)`,p.className=`bg-white rounded-2xl shadow-2xl max-w-sm w-full p-0 transform transition-all duration-300 ease-out fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden ${o(r)}`;let m=i?`<h3 class="text-xl font-bold text-gray-900 leading-snug">${i}</h3>`:``,h=c?`<p class="text-base text-gray-600 leading-relaxed mt-1">${c}</p>`:``;if(p.innerHTML=`
    <div class="p-6 pb-4">
      <div class="flex items-start gap-3.5">
        ${a(r)}
        <div class="flex-1 min-w-0 pt-0.5">
          ${m}
          ${h}
        </div>
      </div>
    </div>
    ${l.length>0?`
      <div class="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-2.5 ${l.length===1?`justify-end`:`justify-center`}">
        ${l.map((e,t)=>`
          <button data-index="${t}" class="${s(e,t,l.length)} px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 active:scale-95">
            ${e.text}
          </button>
        `).join(``)}
      </div>
    `:``}
    ${u?`
      <div class="h-1 bg-gray-100">
        <div class="h-full bg-green-500 origin-left" style="animation: shrink ${d}ms linear forwards"></div>
      </div>
    `:``}
  `,u&&!document.getElementById(`popup-styles`)){let e=document.createElement(`style`);e.id=`popup-styles`,e.textContent=`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `,document.head.appendChild(e)}e.appendChild(f),e.appendChild(p),e.style.display=`block`,requestAnimationFrame(()=>{f.style.opacity=`1`,p.style.opacity=`1`,p.style.transform=`translate(-50%, -50%) scale(1)`});let g=()=>{f.style.opacity=`0`,p.style.opacity=`0`,p.style.transform=`translate(-50%, -48%) scale(0.95)`,setTimeout(()=>{e.contains(p)&&e.removeChild(p),e.contains(f)&&e.removeChild(f),e.children.length===0&&(e.style.display=`none`)},250)};return u&&setTimeout(g,d),new Promise(e=>{p.querySelectorAll(`button`).forEach(t=>{t.addEventListener(`click`,()=>{let n=parseInt(t.dataset.index);g(),e(n)})})})}function l(e,t={}){return c({type:t.type||`info`,title:t.title||``,message:e,buttons:[{text:`OK`,primary:!0}],autoClose:t.autoClose||!1})}function u(e,t={}){return c({type:`confirm`,title:t.title||`Confirm`,message:e,buttons:[{text:`Cancel`,primary:!1},{text:t.confirmText||`Confirm`,primary:!0,danger:t.danger||!1}]})}function d(e,t=`success`,n=3e3){c({type:t,title:t===`success`?`Success`:t===`error`?`Error`:`Info`,message:e,buttons:[],autoClose:!0,duration:n})}function f(e=`default`){let t=r();t.dataset.caller=e,t.style.display=`flex`}function p(e=`default`){i(e)}window.showAlert=l,window.showConfirm=u,window.showToast=d,window.showLoading=f,window.hideLoading=p;export{d as a,f as i,l as n,u as r,p as t};