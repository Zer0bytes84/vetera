(() => {
  const loginView = document.querySelector("#login-view");
  const appView = document.querySelector("#app-view");
  const loginForm = document.querySelector("#login-form");
  const loginInput = document.querySelector("#admin-token");
  const loginError = document.querySelector("#login-error");
  const licenseList = document.querySelector("#license-list");
  const searchInput = document.querySelector("#search-input");
  const statusFilter = document.querySelector("#status-filter");
  const createDialog = document.querySelector("#create-dialog");
  const keyDialog = document.querySelector("#key-dialog");
  let adminToken = "";
  let licenses = [];
  let createdKey = "";

  const formatDate = (value) => {
    if (!value) return "Sans échéance";
    const date = new Date(value);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("x-admin-token", adminToken);
    if (options.body) headers.set("content-type", "application/json");
    return fetch(path, { ...options, headers, cache: "no-store" }).then(
      async (response) => {
        let payload = {};
        try {
          payload = await response.json();
        } catch {
          payload = {};
        }
        if (!response.ok) {
          const error = new Error(payload.error || "La requête a échoué.");
          error.status = response.status;
          error.code = payload.code;
          throw error;
        }
        return payload;
      }
    );
  }

  function setLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = !message;
  }

  function setPageMessage(message, isError = false) {
    const node = document.querySelector("#page-message");
    node.textContent = message;
    node.classList.toggle("error", isError);
    node.hidden = !message;
  }

  function appError(message) {
    const node = document.querySelector("#app-error");
    node.textContent = message;
    node.hidden = !message;
  }

  function licenseState(license) {
    if (license.revokedAt) return "revoked";
    if (license.expiresAt && Date.parse(license.expiresAt) <= Date.now())
      return "expired";
    return license.plan === "trial" ? "trial" : "active";
  }

  function updateStats() {
    const states = licenses.map(licenseState);
    document.querySelector("#stat-active").textContent = String(
      states.filter((state) => state === "active" || state === "trial").length
    );
    document.querySelector("#stat-trial").textContent = String(
      states.filter((state) => state === "trial").length
    );
    document.querySelector("#stat-devices").textContent = String(
      licenses.reduce((total, license) => total + license.deviceCount, 0)
    );
    document.querySelector("#stat-attention").textContent = String(
      states.filter((state) => state === "expired" || state === "revoked").length
    );
    document.querySelector("#license-count").textContent =
      licenses.length + (licenses.length > 1 ? " accès enregistrés" : " accès enregistré");
    document.querySelector("#list-summary").textContent =
      licenses.length + (licenses.length > 1 ? " licences" : " licence");
  }

  function badge(text, className) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = text;
    return node;
  }

  function labeledCell(label, content) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = content;
    return cell;
  }

  async function releaseDevice(license, deviceId) {
    if (!window.confirm("Libérer ce poste ? L’application devra être réactivée sur cet appareil."))
      return;
    appError("");
    try {
      await api("/v1/admin/licenses/" + encodeURIComponent(license.id) + "/release-device", {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      });
      setPageMessage("Poste libéré. Il peut maintenant être remplacé.");
      await loadLicenses();
    } catch (error) {
      appError(error.message);
    }
  }

  async function revokeLicense(license) {
    if (!window.confirm("Révoquer définitivement la licence de " + license.email + " ?"))
      return;
    appError("");
    try {
      await api("/v1/admin/licenses/" + encodeURIComponent(license.id) + "/revoke", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setPageMessage("Licence révoquée.");
      await loadLicenses();
    } catch (error) {
      appError(error.message);
    }
  }

  function renderLicenses() {
    const query = searchInput.value.trim().toLocaleLowerCase("fr");
    const wantedState = statusFilter.value;
    const filtered = licenses
      .filter((license) => license.email.toLocaleLowerCase("fr").includes(query))
      .filter((license) => wantedState === "all" || licenseState(license) === wantedState)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    licenseList.replaceChildren();
    document.querySelector("#empty-state").hidden = filtered.length !== 0;

    for (const license of filtered) {
      const row = document.createElement("tr");
      const account = document.createElement("div");
      account.className = "account-cell";
      const email = document.createElement("strong");
      email.textContent = license.email;
      account.append(email);
      if (license.devices.length) {
        const devices = document.createElement("div");
        devices.className = "device-list";
        for (const deviceId of license.devices) {
          const chip = document.createElement("span");
          chip.className = "device-chip";
          const idText = document.createElement("span");
          idText.textContent = deviceId;
          idText.title = deviceId;
          const release = document.createElement("button");
          release.type = "button";
          release.setAttribute("aria-label", "Libérer le poste " + deviceId);
          release.title = "Libérer ce poste";
          release.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>';
          release.addEventListener("click", () => releaseDevice(license, deviceId));
          chip.append(idText, release);
          devices.append(chip);
        }
        account.append(devices);
      } else {
        const noDevice = document.createElement("small");
        noDevice.className = "field-note";
        noDevice.textContent = "Aucun poste associé";
        account.append(noDevice);
      }
      row.append(labeledCell("Compte", account));

      const plan = badge(
        license.plan === "trial" ? "Essai" : "Cabinet",
        "plan-badge" + (license.plan === "trial" ? " trial" : "")
      );
      row.append(labeledCell("Formule", plan));

      const deviceCount = document.createElement("span");
      deviceCount.textContent = license.deviceCount + " / " + license.maxDevices;
      row.append(labeledCell("Appareils", deviceCount));
      row.append(labeledCell("Expiration", formatDate(license.expiresAt)));

      const state = licenseState(license);
      const stateLabels = {
        active: ["Active", "state-badge active"],
        trial: ["Essai en cours", "state-badge attention"],
        expired: ["Expirée", "state-badge expired"],
        revoked: ["Révoquée", "state-badge revoked"],
      };
      row.append(labeledCell("État", badge(...stateLabels[state])));

      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "action-group";
      if (state !== "revoked") {
        const revoke = document.createElement("button");
        revoke.type = "button";
        revoke.className = "row-action danger";
        revoke.textContent = "Révoquer";
        revoke.addEventListener("click", () => revokeLicense(license));
        actions.append(revoke);
      }
      actionsCell.append(actions);
      row.append(actionsCell);
      licenseList.append(row);
    }
    document.querySelector("#list-summary").textContent =
      filtered.length + (filtered.length > 1 ? " affichées" : " affichée");
  }

  async function loadLicenses() {
    try {
      appError("");
      setPageMessage("");
      const result = await api("/v1/admin/licenses");
      licenses = Array.isArray(result.licenses) ? result.licenses : [];
      updateStats();
      renderLicenses();
    } catch (error) {
      if (error.status === 401) logout("Session expirée. Connectez-vous à nouveau.");
      else appError(error.message);
    }
  }

  function logout(message = "") {
    adminToken = "";
    licenses = [];
    licenseList.replaceChildren();
    for (const id of ["stat-active", "stat-trial", "stat-devices", "stat-attention"])
      document.querySelector("#" + id).textContent = "—";
    document.querySelector("#license-count").textContent = "";
    document.querySelector("#list-summary").textContent = "—";
    searchInput.value = "";
    statusFilter.value = "all";
    loginInput.value = "";
    loginView.hidden = false;
    appView.hidden = true;
    setLoginError(message);
    loginInput.focus();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    const token = loginInput.value.trim();
    if (!token) return;
    adminToken = token;
    const submit = loginForm.querySelector("button[type='submit']");
    submit.disabled = true;
    submit.querySelector("span").textContent = "Vérification…";
    try {
      await api("/v1/admin/verify");
      loginView.hidden = true;
      appView.hidden = false;
      loginInput.value = "";
      await loadLicenses();
    } catch (error) {
      adminToken = "";
      setLoginError(error.message || "Jeton invalide.");
    } finally {
      submit.disabled = false;
      submit.querySelector("span").textContent = "Ouvrir la console";
    }
  });

  document.querySelector("#logout-button").addEventListener("click", () => logout());
  document.querySelector("#refresh-button").addEventListener("click", loadLicenses);
  searchInput.addEventListener("input", renderLicenses);
  statusFilter.addEventListener("change", renderLicenses);
  document.querySelector("#open-create").addEventListener("click", () => {
    document.querySelector("#create-error").hidden = true;
    document.querySelector("#create-form").reset();
    document.querySelector("#license-devices").value = "2";
    syncExpiryField();
    createDialog.showModal();
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.close);
      if (dialog === keyDialog) clearCreatedKey();
      dialog.close();
    });
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        if (dialog === keyDialog) clearCreatedKey();
        dialog.close();
      }
    });
    dialog.addEventListener("cancel", () => {
      if (dialog === keyDialog) clearCreatedKey();
    });
  });

  function syncExpiryField() {
    const isTrial = document.querySelector("#license-plan").value === "trial";
    const field = document.querySelector("#expiry-field");
    const expiry = document.querySelector("#license-expiry");
    field.hidden = !isTrial;
    expiry.required = isTrial;
    if (isTrial && !expiry.value) {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      expiry.value = date.toISOString().slice(0, 10);
    }
  }

  document.querySelector("#license-plan").addEventListener("change", syncExpiryField);
  document.querySelector("#create-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorNode = document.querySelector("#create-error");
    errorNode.textContent = "";
    errorNode.hidden = true;
    const plan = document.querySelector("#license-plan").value;
    const body = {
      email: document.querySelector("#license-email").value,
      plan,
      maxDevices: Number(document.querySelector("#license-devices").value),
    };
    const expiryValue = document.querySelector("#license-expiry").value;
    if (expiryValue) body.expiresAt = new Date(expiryValue + "T23:59:59").toISOString();
    const submit = document.querySelector("#create-submit");
    submit.disabled = true;
    submit.textContent = "Création…";
    try {
      const result = await api("/v1/admin/licenses", {
        method: "POST",
        body: JSON.stringify(body),
      });
      createDialog.close();
      createdKey = result.licenseKey;
      document.querySelector("#created-key").textContent = createdKey;
      document.querySelector("#created-email").textContent = result.license.email;
      document.querySelector("#copy-status").textContent = "Transmettez la clé au cabinet par un canal sûr.";
      keyDialog.showModal();
      await loadLicenses();
    } catch (error) {
      errorNode.textContent = error.message;
      errorNode.hidden = false;
    } finally {
      submit.disabled = false;
      submit.innerHTML = "<span>Créer la licence</span>";
    }
  });

  function clearCreatedKey() {
    createdKey = "";
    document.querySelector("#created-key").textContent = "";
    document.querySelector("#created-email").textContent = "";
  }
  document.querySelector("#copy-key").addEventListener("click", async () => {
    const status = document.querySelector("#copy-status");
    try {
      await navigator.clipboard.writeText(createdKey);
      status.textContent = "Clé copiée. Conservez-la avant de fermer cette fenêtre.";
    } catch {
      status.textContent = "La copie est bloquée par le navigateur : sélectionnez la clé pour la copier.";
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector("#created-key"));
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
})();
