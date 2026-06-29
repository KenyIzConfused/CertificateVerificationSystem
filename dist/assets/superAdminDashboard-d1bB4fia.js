import"./ui-enhancements-7oFrcUkB.js";import{a as e,i as t,n,r,t as i}from"./PopupSystem-C6gwMGe4.js";import{initializeApp as a}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getAuth as o,onAuthStateChanged as s,signOut as c}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";import{collection as l,doc as u,getDoc as d,getFirestore as f,onSnapshot as p,updateDoc as m,writeBatch as h}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";var g=a({apiKey:`AIzaSyCKuHUI87RMQK70Cvxm4YO2Jl1UDdoeAfw`,authDomain:`certificateverification-8ef83.firebaseapp.com`,projectId:`certificateverification-8ef83`,storageBucket:`certificateverification-8ef83.firebasestorage.app`,messagingSenderId:`797766748638`,appId:`1:797766748638:web:2b716ec9e7c6f64c27b54f`,measurementId:`G-19BFPGEFEK`}),_=o(g),v=f(g),y=e=>{let t=document.createElement(`div`);return t.textContent=e,t.innerHTML},b=new Set;window.toggleHistorySelection=(e,t)=>{t?b.add(e):b.delete(e),x()},window.toggleSelectAllHistory=e=>{b.clear(),e&&document.getElementById(`historyContainer`).querySelectorAll(`input[type="checkbox"][data-admin-id]`).forEach(e=>{b.add(e.dataset.adminId)}),x()};var x=()=>{let e=document.getElementById(`deleteSelectedBtn`),t=document.getElementById(`selectedCount`),n=b.size;t.textContent=n,n>0?e.classList.remove(`hidden`):e.classList.add(`hidden`)};window.deleteHistoryEntry=async a=>{if(await r(`Are you sure you want to delete this history entry?`)===1)try{t(`deleteHistory`),await m(u(v,`Admin`,a),{deleted:!0}),b.delete(a),x(),i(`deleteHistory`),e(`History entry deleted`)}catch(e){i(`deleteHistory`),console.error(`Error deleting history entry:`,e),n(`Failed to delete history entry`,{type:`error`})}},window.deleteSelectedHistory=async()=>{if(b.size!==0&&await r(`Delete ${b.size} selected history entry/entries?`)===1)try{t(`deleteSelectedHistory`);let n=h(v);b.forEach(e=>{n.update(u(v,`Admin`,e),{deleted:!0})}),await n.commit(),b.clear(),x(),i(`deleteSelectedHistory`),e(`Selected history entries deleted`)}catch(e){i(`deleteSelectedHistory`),console.error(`Error deleting selected history:`,e),n(`Failed to delete selected entries`,{type:`error`})}},window.approveAdmin=async(a,o)=>{if(await r(`Approve ${o}? This will allow them to login.`)===1)try{t(`approve`),await m(u(v,`Admin`,a),{status:`approved`,approvedAt:new Date}),i(`approve`),e(`Admin approved successfully`)}catch(e){i(`approve`),console.error(`Error approving admin:`,e),n(`Failed to approve admin`,{type:`error`})}},window.rejectAdmin=async(r,a)=>{let o=prompt(`Reject ${a}?\n\nEnter rejection reason:`);if(o!==null)try{t(`reject`),await m(u(v,`Admin`,r),{status:`rejected`,rejectedAt:new Date,reason:o||`Rejected by System Admin`}),i(`reject`),e(`Admin rejected`)}catch(e){i(`reject`),console.error(`Error rejecting admin:`,e),n(`Failed to reject admin`,{type:`error`})}};var S=e=>{if(!e)return`N/A`;try{return typeof e.toDate==`function`?e.toDate().toLocaleString():new Date(e).toLocaleString()}catch{return`N/A`}},C=e=>{let t=document.getElementById(`pendingAdminsContainer`),n=e.filter(e=>e.status===`pending`&&!e.deleted);if(n.length===0){t.innerHTML=`<p class="dashboard-empty-state">No pending approvals.</p>`;return}t.innerHTML=n.map(e=>{let t=e.role===`super_admin`?`System Admin`:`College Admin`;return`
      <article class="approval-request">
        <div class="approval-request__body">
          <h3 class="approval-request__title">${y(e.collegeName)} <span class="admin-type-badge">(${t})</span></h3>
          <p class="approval-request__meta">${y(e.email)}</p>
          <p class="approval-request__meta approval-request__meta--muted">Created: ${S(e.createdAt)}</p>
          <p class="approval-request__meta approval-request__meta--muted">Updated: ${S(e.updatedAt)}</p>
        </div>
        <div class="approval-request__actions">
          <button onclick="window.approveAdmin('${e.id}', '${y(e.collegeName)}')" 
            class="approval-action approval-action--approve">
            Approve
          </button>
          <button onclick="window.rejectAdmin('${e.id}', '${y(e.collegeName)}')" 
            class="approval-action approval-action--reject">
            Reject
          </button>
        </div>
      </article>
    `}).join(``)},w=e=>{let t=document.getElementById(`historyContainer`),n=e.filter(e=>(e.status===`approved`||e.status===`rejected`)&&!e.deleted);if(n.length===0){t.innerHTML=`<p class="dashboard-empty-state">No history yet.</p>`;return}let r=[...n].sort((e,t)=>{let n=e.approvedAt||e.rejectedAt||e.createdAt,r=t.approvedAt||t.rejectedAt||t.createdAt;return new Date(r)-new Date(n)}),i=e=>b.has(e);t.innerHTML=r.map(e=>{let t=e.status===`approved`,n=t?e.approvedAt?new Date(e.approvedAt.toDate()).toLocaleString():`N/A`:e.rejectedAt?new Date(e.rejectedAt.toDate()).toLocaleString():`N/A`,r=t?`Approved`:`Rejected`;return`
      <article class="history-entry">
        <div class="history-entry__top">
          <div class="history-entry__body">
            <h3>${y(e.collegeName)}</h3>
            <p>${y(e.email)}</p>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" class="history-checkbox" data-admin-id="${e.id}" ${i(e.id)?`checked`:``} onchange="window.toggleHistorySelection('${e.id}', this.checked)">
            <span class="history-badge ${t?`history-badge--approved`:`history-badge--rejected`}">
              ${r}
            </span>
          </div>
        </div>
        <div class="history-entry__footer">
          <span>${n}</span>
          ${e.reason?`<span>Reason: ${y(e.reason)}</span>`:``}
        </div>
        <div class="history-entry__actions">
          <button onclick="window.deleteHistoryEntry('${e.id}')" 
            class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all shadow-sm">
            Delete
          </button>
        </div>
      </article>
    `}).join(``)};window.handleLogout=async()=>{try{await c(_),sessionStorage.removeItem(`superAdminLoggedIn`),localStorage.clear()}catch(e){console.error(`Logout error:`,e)}window.location.href=`../logIn/LogInSuperAdmin.html?v=`+Date.now()},s(_,async e=>{if(!e){window.location.href=`../logIn/LogInSuperAdmin.html`;return}let t=await d(u(v,`Admin`,e.uid));if(!t.exists()||t.data().role!==`super_admin`){await c(_),window.location.href=`../logIn/LogInSuperAdmin.html`;return}if(t.data().status!==`approved`){await c(_),window.location.href=`../logIn/LogInSuperAdmin.html`;return}let n=document.getElementById(`selectAllHistory`);n&&n.addEventListener(`change`,e=>{window.toggleSelectAllHistory(e.target.checked)}),p(l(v,`Admin`),e=>{let t=[];e.forEach(e=>{let n=e.data();n.deleted||(n.role!==`super_admin`||n.status===`pending`)&&t.push({id:e.id,...n})}),C(t),w(t);let n=document.getElementById(`selectAllHistory`);if(n){let e=document.getElementById(`historyContainer`).querySelectorAll(`input[type="checkbox"][data-admin-id]`);n.checked=e.length>0&&b.size===e.length}})});