let participants = [];
let transactions = [];
let currentContributors = [];
let lastComputed = { detailed: [], normal: [], advanced: [] };

const participantNameInput = document.getElementById("participantName");
const addParticipantBtn = document.getElementById("addParticipantBtn");
const participantsListDiv = document.getElementById("participantsList");

const contribSelect = document.getElementById("contribSelect");
const contribAmountInput = document.getElementById("contribAmount");
const addContribBtn = document.getElementById("addContribBtn");
const contributorsListDiv = document.getElementById("contributorsList");

const paidForListDiv = document.getElementById("paidForList");
const txNoteInput = document.getElementById("txNote");
const saveTransactionBtn = document.getElementById("saveTransactionBtn");
const resetTransactionBtn = document.getElementById("resetTransactionBtn");

const resultsArea = document.getElementById("resultsArea");
const transactionsListDiv = document.getElementById("transactionsList");
const noParticipantsAlert = document.getElementById("noParticipantsAlert");

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(v) {
  return "₹" + v;
}

function toInt(v) {
  const n = Number(v);
  return !isNaN(n) && isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function refreshParticipantsUI() {
  participantsListDiv.innerHTML = "";
  participants.forEach((name) => {
    const el = document.createElement("div");
    el.className = "participant";
    el.innerHTML = `<span>${name}</span><button class="remove" data-name="${name}">✕</button>`;
    participantsListDiv.appendChild(el);
  });
  updateContribSelect();
  renderPaidForOptions();
  refreshTransactionsUI();
  checkFormAvailability();
  computeAndRenderResults();
}

addParticipantBtn.addEventListener("click", () => {
  const name = participantNameInput.value.trim();
  if (!name) {
    alert("Enter a valid name");
    return;
  }
  if (participants.includes(name)) {
    alert("That name already exists");
    participantNameInput.value = "";
    return;
  }
  participants.push(name);
  participantNameInput.value = "";
  refreshParticipantsUI();
});

participantsListDiv.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove")) {
    const name = e.target.dataset.name;
    const confirmRemove = confirm(
      `Remove ${name}? This will delete transactions referencing them.`
    );
    if (!confirmRemove) return;
    participants = participants.filter((p) => p !== name);
    transactions = transactions.filter(
      (tx) =>
        !tx.contributors.some((c) => c.name === name) &&
        !tx.paidFor.includes(name)
    );
    refreshParticipantsUI();
  }
});

function updateContribSelect() {
  contribSelect.innerHTML = `<option value="">Select payer</option>`;
  participants.forEach((p) => {
    const o = document.createElement("option");
    o.value = p;
    o.textContent = p;
    contribSelect.appendChild(o);
  });
}

function renderPaidForOptions() {
  paidForListDiv.innerHTML = "";
  participants.forEach((p) => {
    const lbl = document.createElement("label");
    lbl.className = "paidfor-item";
    lbl.innerHTML = `<input type="checkbox" value="${p}"> ${p}`;
    paidForListDiv.appendChild(lbl);
  });
}

function renderCurrentContributors() {
  contributorsListDiv.innerHTML = "";
  currentContributors.forEach((c, idx) => {
    const d = document.createElement("div");
    d.className = "contrib-pill";
    d.innerHTML = `${c.name}: ${fmt(
      c.amount
    )} <button class="x" data-i="${idx}">✕</button>`;
    contributorsListDiv.appendChild(d);
  });
}

addContribBtn.addEventListener("click", () => {
  if (participants.length === 0) {
    alert("Add participants first");
    return;
  }
  const name = contribSelect.value;
  const amt = toInt(contribAmountInput.value);
  if (!name) {
    alert("Select payer");
    return;
  }
  if (amt === null) {
    alert("Enter a valid non-negative amount");
    return;
  }
  currentContributors.push({ name, amount: amt });
  contribAmountInput.value = "";
  renderCurrentContributors();
});

contributorsListDiv.addEventListener("click", (e) => {
  if (e.target.classList.contains("x")) {
    const i = Number(e.target.dataset.i);
    if (!Number.isNaN(i)) currentContributors.splice(i, 1);
    renderCurrentContributors();
  }
});

resetTransactionBtn.addEventListener("click", () => {
  currentContributors = [];
  txNoteInput.value = "";
  contribAmountInput.value = "";
  contribSelect.value = "";
  document
    .querySelectorAll("#paidForList input[type=checkbox]")
    .forEach((cb) => (cb.checked = false));
  renderCurrentContributors();
});

saveTransactionBtn.addEventListener("click", () => {
  if (participants.length === 0) {
    alert("Add participants first");
    return;
  }
  if (currentContributors.length === 0) {
    alert("Add at least one contributor");
    return;
  }

  const paidFor = Array.from(
    document.querySelectorAll("#paidForList input[type=checkbox]")
  )
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  if (paidFor.length === 0) {
    alert("Select at least one beneficiary");
    return;
  }

  const invalidContributor = currentContributors.some(
    (c) => !participants.includes(c.name)
  );
  if (invalidContributor) {
    alert("Contributor is missing from participants");
    return;
  }

  transactions.push({
    id: uid(),
    contributors: currentContributors.map((c) => ({ ...c })),
    paidFor: [...paidFor],
    note: txNoteInput.value || "",
    createdAt: new Date().toLocaleString(),
  });

  resetTransactionBtn.click();
  refreshTransactionsUI();
  computeAndRenderResults();
});

function refreshTransactionsUI() {
  transactionsListDiv.innerHTML = "";
  if (transactions.length === 0) {
    transactionsListDiv.innerHTML =
      '<div class="small-muted">No transactions yet.</div>';
    return;
  }
  transactions.forEach((tx) => {
    const card = document.createElement("div");
    card.className = "tx-card";
    const contributorsText = tx.contributors
      .map((c) => `${c.name}(${fmt(c.amount)})`)
      .join(", ");
    card.innerHTML = `<div><strong>${contributorsText}</strong></div>
      <div class="meta">Paid for: ${tx.paidFor.join(", ")}</div>
      <div class="note">${
        tx.note || '<span class="small-muted">(no note)</span>'
      }</div>
      <div style="margin-top:8px"><button data-id="${
        tx.id
      }" class="viewTx">View / Remove</button></div>`;
    transactionsListDiv.appendChild(card);
  });
}

transactionsListDiv.addEventListener("click", (e) => {
  const b = e.target.closest("button.viewTx");
  if (!b) return;
  const id = b.dataset.id;
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;
  const cText = tx.contributors
    .map((c) => `${c.name}: ${fmt(c.amount)}`)
    .join("\n");
  const doRemove = confirm(
    `Transaction details:\n\n${cText}\n\nPaid for: ${tx.paidFor.join(
      ", "
    )}\nNote: ${tx.note || "(none)"}\n\nRemove this transaction?`
  );
  if (doRemove) {
    transactions = transactions.filter((t) => t.id !== id);
    refreshTransactionsUI();
    computeAndRenderResults();
  }
});

function computeMatrix() {
  const n = participants.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const idxOf = (name) => participants.indexOf(name);

  transactions.forEach((tx) => {
    tx.contributors.forEach((contrib) => {
      const payer = contrib.name;
      const amt = contrib.amount;
      const beneficiaries = tx.paidFor;
      if (!payer || beneficiaries.length === 0) return;
      const perShare = Math.ceil(amt / beneficiaries.length);
      beneficiaries.forEach((ben) => {
        const bi = idxOf(ben);
        const pi = idxOf(payer);
        if (bi >= 0 && pi >= 0 && bi !== pi) {
          matrix[bi][pi] += perShare;
        }
      });
    });
  });

  return matrix;
}

function converter(matrix) {
  const res = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (i === j) continue;
      const amt = matrix[i][j];
      if (amt && amt > 0) {
        res.push({ from: participants[i], to: participants[j], amount: amt });
      }
    }
  }
  return res;
}

function cancelMutual(matrix) {
  const m = matrix.map((row) => row.slice());
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m.length; j++) {
      if (i === j) continue;
      if (m[i][j] && m[j][i]) {
        if (m[i][j] >= m[j][i]) {
          m[i][j] = m[i][j] - m[j][i];
          m[j][i] = 0;
        } else {
          m[j][i] = m[j][i] - m[i][j];
          m[i][j] = 0;
        }
      }
    }
  }
  for (let k = 0; k < m.length; k++) {
    m[k][k] = 0;
  }
  return m;
}

function computeAdvancedSettlement(normalMatrix) {
  const n = participants.length;
  const balances = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      balances[j] += normalMatrix[i][j];
      balances[i] -= normalMatrix[i][j];
    }
  }

  const creditors = [];
  const debtors = [];

  for (let i = 0; i < n; i++) {
    if (balances[i] > 0) {
      creditors.push({ idx: i, amt: balances[i] });
    } else if (balances[i] < 0) {
      debtors.push({ idx: i, amt: Math.abs(balances[i]) });
    }
  }

  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const settlements = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const transfer = Math.min(credit.amt, debt.amt);

    if (transfer > 0 && credit.idx !== debt.idx) {
      settlements.push({
        from: participants[debt.idx],
        to: participants[credit.idx],
        amount: transfer,
      });
    }

    credit.amt -= transfer;
    debt.amt -= transfer;

    if (credit.amt === 0) ci++;
    if (debt.amt === 0) di++;
  }

  return settlements;
}

function computeAndRenderResults() {
  if (participants.length === 0 || transactions.length === 0) {
    lastComputed = { detailed: [], normal: [], advanced: [] };
    showEmptyResultsMessage();
    return;
  }

  const matrix = computeMatrix();
  const detailedList = converter(matrix);
  const normalMatrix = cancelMutual(matrix);
  const normalList = converter(normalMatrix);
  const advancedList = computeAdvancedSettlement(normalMatrix);

  lastComputed = {
    detailed: detailedList,
    normal: normalList,
    advanced: advancedList,
  };

  showResults("detailed");
}

function showEmptyResultsMessage() {
  resultsArea.innerHTML =
    '<div class="small-muted">No payments to show. Add transactions to compute results.</div>';
}

function showResults(mode) {
  resultsArea.innerHTML = "";
  const list = lastComputed[mode] || [];
  if (!Array.isArray(list) || list.length === 0) {
    resultsArea.innerHTML = `<div class="small-muted">No payments to show for "${mode}".</div>`;
    return;
  }

  list.forEach((item) => {
    if (!item || !item.from || !item.to || item.from === item.to) return;
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `<div><strong>${item.from}</strong> pays <strong>${
      item.to
    }</strong></div>
                     <div>${fmt(item.amount)}</div>`;
    resultsArea.appendChild(row);
  });
}

document.querySelectorAll(".toggleBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    showResults(mode);
  });
});

function checkFormAvailability() {
  const disabled = participants.length === 0;
  addContribBtn.disabled = disabled;
  saveTransactionBtn.disabled = disabled;
  noParticipantsAlert.classList.toggle("hidden", !disabled);
}

refreshParticipantsUI();
checkFormAvailability();
showEmptyResultsMessage();