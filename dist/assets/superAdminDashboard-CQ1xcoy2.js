import"./ui-enhancements-oSulpFv0.js";import{a as e,i as t,n,r,t as i}from"./PopupSystem-C6gwMGe4.js";import{initializeApp as a}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getAuth as o,onAuthStateChanged as s,signOut as c}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";import{collection as l,doc as u,getDoc as d,getFirestore as f,onSnapshot as p,updateDoc as m}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";var h=a({apiKey:`AIzaSyCKuHUI87RMQK70Cvxm4YO2Jl1UDdoeAfw`,authDomain:`certificateverification-8ef83.firebaseapp.com`,projectId:`certificateverification-8ef83`,storageBucket:`certificateverification-8ef83.firebasestorage.app`,messagingSenderId:`797766748638`,appId:`1:797766748638:web:2b716ec9e7c6f64c27b54f`,measurementId:`G-19BFPGEFEK`}),g=o(h),_=f(h),v=e=>{let t=document.createElement(`div`);return t.textContent=e,t.innerHTML};window.approveAdmin=async(a,o)=>{if(await r(`Approve ${o}? This will allow them to login.`)===1)try{t(`approve`),await m(u(_,`Admin`,a),{status:`approved`}),i(`approve`),e(`Admin approved successfully`)}catch(e){i(`approve`),console.error(`Error approving admin:`,e),n(`Failed to approve admin`,{type:`error`})}},window.rejectAdmin=async(r,a)=>{let o=prompt(`Reject ${a}?\n\nEnter rejection reason:`);if(o!==null)try{t(`reject`),await m(u(_,`Admin`,r),{status:`rejected`,rejectedAt:new Date,reason:o||`Rejected by System Admin`}),i(`reject`),e(`Admin rejected`)}catch(e){i(`reject`),console.error(`Error rejecting admin:`,e),n(`Failed to reject admin`,{type:`error`})}};var y=e=>{if(!e)return`N/A`;try{return typeof e.toDate==`function`?e.toDate().toLocaleString():new Date(e).toLocaleString()}catch{return`N/A`}},b=e=>{let t=document.getElementById(`pendingAdminsContainer`),n=e.filter(e=>e.status===`pending`);if(n.length===0){t.innerHTML=`<p class="dashboard-empty-state">No pending approvals.</p>`;return}t.innerHTML=n.map(e=>{let t=e.role===`super_admin`?`System Admin`:`College Admin`;return`
      <article class="approval-request">
        <div class="approval-request__body">
          <h3 class="approval-request__title">${v(e.collegeName)} <span class="admin-type-badge">(${t})</span></h3>
          <p class="approval-request__meta">${v(e.email)}</p>
          <p class="approval-request__meta approval-request__meta--muted">Created: ${y(e.createdAt)}</p>
          <p class="approval-request__meta approval-request__meta--muted">Updated: ${y(e.updatedAt)}</p>
        </div>
        <div class="approval-request__actions">
          <button onclick="window.approveAdmin('${e.id}', '${v(e.collegeName)}')" 
            class="approval-action approval-action--approve">
            Approve
          </button>
          <button onclick="window.rejectAdmin('${e.id}', '${v(e.collegeName)}')" 
            class="approval-action approval-action--reject">
            Reject
          </button>
        </div>
      </article>
    `}).join(``)},x=e=>{let t=document.getElementById(`historyContainer`),n=e.filter(e=>e.status===`approved`||e.status===`rejected`);if(n.length===0){t.innerHTML=`<p class="dashboard-empty-state">No history yet.</p>`;return}t.innerHTML=[...n].sort((e,t)=>{let n=e.approvedAt||e.rejectedAt||e.createdAt,r=t.approvedAt||t.rejectedAt||t.createdAt;return new Date(r)-new Date(n)}).map(e=>{let t=e.status===`approved`,n=t?e.approvedAt?new Date(e.approvedAt.toDate()).toLocaleString():`N/A`:e.rejectedAt?new Date(e.rejectedAt.toDate()).toLocaleString():`N/A`,r=t?`Approved`:`Rejected`;return`
      <article class="history-entry">
        <div class="history-entry__top">
          <div class="history-entry__body">
            <h3>${v(e.collegeName)}</h3>
            <p>${v(e.email)}</p>
          </div>
          <span class="history-badge ${t?`history-badge--approved`:`history-badge--rejected`}">
            ${r}
          </span>
        </div>
        <div class="history-entry__footer">
          <span>${n}</span>
          ${e.reason?`<span>Reason: ${v(e.reason)}</span>`:``}
        </div>
      </article>
    `}).join(``)};window.handleLogout=async()=>{try{await c(g),sessionStorage.removeItem(`superAdminLoggedIn`),localStorage.clear()}catch(e){console.error(`Logout error:`,e)}window.location.href=`../logIn/LogInAdmin.html?v=`+Date.now()},s(g,async e=>{if(!e){window.location.href=`../logIn/LogInAdmin.html`;return}let t=await d(u(_,`Admin`,e.uid));if(!t.exists()||t.data().role!==`super_admin`){await c(g),window.location.href=`../logIn/LogInAdmin.html`;return}if(t.data().status!==`approved`){await c(g),window.location.href=`../logIn/LogInAdmin.html`;return}p(l(_,`Admin`),e=>{let t=[];e.forEach(e=>{let n=e.data();(n.role!==`super_admin`||n.status===`pending`)&&t.push({id:e.id,...n})}),b(t),x(t)})});