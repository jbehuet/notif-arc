<script>
    let email = "", name = "", message = "", ok = false, honey = "";
    async function submit(e) {
        e.preventDefault(); message = ""; ok = false;
        const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ email, name, honey })
        });

        const data = res.ok ? await res.json() : null;;
        ok = res.ok;
        if (ok && data) {
            message = data.message
        } else {
            message = "Une erreur est survenue. Veuillez réessayer plus tard.";
        }
        if (ok) { email = ""; name = ""; }
    }
</script>

<main class="container">
    <h1>Recevoir les alertes</h1>
    <p>Inscrivez-vous pour être notifié quand un nouveau mandat de <strong>tir à 18m</strong> est publié sur <a href="www.crnata.fr" target="_blank">CRNATA</a>.</p>
    <article>
        <form on:submit={submit}>
            <fieldset role="group">
                <input type="email" name="email" bind:value={email} placeholder="email@exemple.fr" required />
                <button type="submit">S’abonner</button>
            </fieldset>

            <!-- Honeypot anti-bot -->
            <input type="text" bind:value={honey} style="position:absolute;left:-10000px;top:-10000px" tabindex="-1" autocomplete="off" aria-hidden="true" />
            {#if message}
                <p role="status" class={ok ? "success" : "error"}>{message}</p>
            {/if}
        </form>

        <p><small><em>Votre email est utilisé uniquement pour l’envoi des alertes. Un lien de désinscription est présent dans chaque message.</em></small></p>
    </article>
</main>

