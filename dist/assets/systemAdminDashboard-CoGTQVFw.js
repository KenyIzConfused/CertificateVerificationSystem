import{a as e,i as t,n,o as r,r as i,s as a,t as o}from"./PopupSystem-B76ildMY.js";import{getAuth as s,onAuthStateChanged as c,signOut as l}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";import{collection as u,doc as d,getDoc as f,onSnapshot as p,updateDoc as m}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";var h=e=>{let t=document.createElement(`div`);return t.textContent=e,t.innerHTML};window.approveAdmin=async(r,s)=>{if(await i(`Approve ${s}? This will allow them to login.`)===1)try{t(`approve`),await m(d(a,`Admin`,r),{status:`approved`,approvedAt:new Date}),o(`approve`),e(`Admin approved successfully`)}catch(e){o(`approve`),console.error(`Error approving admin:`,e),n(`Failed to approve admin`,{type:`error`})}},window.rejectAdmin=async(r,i)=>{let s=prompt(`Reject ${i}?\n\nEnter rejection reason:`);if(s!==null)try{t(`reject`),await m(d(a,`Admin`,r),{status:`rejected`,rejectedAt:new Date,reason:s||`Rejected by System Admin`}),o(`reject`),e(`Admin rejected`)}catch(e){o(`reject`),console.error(`Error rejecting admin:`,e),n(`Failed to reject admin`,{type:`error`})}};var g=e=>{if(!e)return`N/A`;try{return typeof e.toDate==`function`?e.toDate().toLocaleString():new Date(e).toLocaleString()}catch{return`N/A`}},_=e=>{let t=document.getElementById(`pendingAdminsContainer`),n=e.filter(e=>e.status===`pending`);if(n.length===0){t.innerHTML=`<p class="dashboard-empty-state">No pending approvals.</p>`;return}t.innerHTML=n.map(e=>{let t=e.role===`system_admin`||e.role===`super_admin`?`System Admin`:`College Admin`;return`
      <article class="approval-request">
        <div class="approval-request__body">
          <h3 class="approval-request__title">${h(e.collegeName)} <span class="admin-type-badge">(${t})</span></h3>
          <p class="approval-request__meta">${h(e.email)}</p>
          <p class="approval-request__meta approval-request__meta--muted">Created: ${g(e.createdAt)}</p>
        </div>
        <div class="approval-request__actions">
          <button onclick="window.approveAdmin('${e.id}', '${h(e.collegeName)}')" 
            class="approval-action approval-action--approve">
            Approve
          </button>
          <button onclick="window.rejectAdmin('${e.id}', '${h(e.collegeName)}')" 
            class="approval-action approval-action--reject">
            Reject
          </button>
        </div>
      </article>
    `}).join(``)},v=e=>{let t=document.getElementById(`historyContainer`),n=e.filter(e=>e.status===`approved`||e.status===`rejected`);if(n.length===0){t.innerHTML=`<p class="dashboard-empty-state">No history yet.</p>`;return}t.innerHTML=[...n].sort((e,t)=>{let n=e.approvedAt||e.rejectedAt||e.createdAt,r=t.approvedAt||t.rejectedAt||t.createdAt;return new Date(r)-new Date(n)}).map(e=>{let t=e.status===`approved`,n=g(t?e.approvedAt:e.rejectedAt),r=t?`Approved`:`Rejected`;return`
      <article class="history-entry">
        <div class="history-entry__top">
          <div class="history-entry__body">
            <h3>${h(e.collegeName)}</h3>
            <p>${h(e.email)}</p>
          </div>
          <span class="history-badge ${t?`history-badge--approved`:`history-badge--rejected`}">
            ${r}
          </span>
        </div>
        <div class="history-entry__footer">
          <span>${n}</span>
          ${e.reason?`<span>Reason: ${h(e.reason)}</span>`:``}
        </div>
      </article>
    `}).join(``)};window.openSettings=async()=>{let e=await f(d(a,`Admin`,(await s(app).currentUser).uid)),t=e.exists()?e.data():{},n=document.getElementById(`adminName`);n.value=t.collegeName||``,document.getElementById(`settingsModal`).classList.remove(`hidden`),document.getElementById(`settingsModal`).classList.add(`flex`)},window.closeSettings=()=>{let e=document.getElementById(`settingsModal`);e&&(e.classList.add(`hidden`),e.classList.remove(`flex`))},document.getElementById(`settingsForm`).addEventListener(`submit`,async i=>{i.preventDefault();let s=document.getElementById(`adminName`).value.trim(),c=r.currentUser;if(c)try{t(`changeName`),await m(d(a,`Admin`,c.uid),{collegeName:s}),o(`changeName`),document.getElementById(`headerName`).textContent=s,window.closeSettings(),e(`Name updated successfully`)}catch(e){o(`changeName`),console.error(`Error updating name:`,e),n(`Failed to update name`,{type:`error`})}}),window.handleLogout=async()=>{try{await l(r),sessionStorage.removeItem(`adminLoggedIn`),sessionStorage.removeItem(`systemAdminLoggedIn`),localStorage.removeItem(`orgName`)}catch(e){console.error(`Logout error:`,e)}window.location.href=`../logIn/LogInAdmin.html?v=`+Date.now()};var y=document.getElementById(`settingsBtn`),b=document.getElementById(`settingsDropdown`);y&&b&&(y.addEventListener(`click`,e=>{e.stopPropagation(),b.classList.toggle(`hidden`)}),document.addEventListener(`click`,()=>{b.classList.add(`hidden`)}),b.addEventListener(`click`,e=>{e.stopPropagation()})),c(r,async e=>{if(!e){window.location.href=`../logIn/LogInAdmin.html`;return}let t=await f(d(a,`Admin`,e.uid));if(!t.exists()||t.data().role!==`system_admin`&&t.data().role!==`super_admin`){await l(r),window.location.href=`../logIn/LogInAdmin.html`;return}if(t.data().status!==`approved`){await l(r),window.location.href=`../logIn/LogInAdmin.html`;return}let n=t.data();document.getElementById(`headerName`).textContent=n.collegeName||`System Admin`,p(u(a,`Admin`),e=>{let t=[];e.forEach(e=>{t.push({id:e.id,...e.data()})}),_(t),v(t)})});