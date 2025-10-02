<script>
    export let data;
    let email = "", name = "", message = "", ok = false, honey = "";
    async function submit(e) {
        e.preventDefault(); message = ""; ok = false;
        const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ email, name, honey })
        });

        const result = res.ok ? await res.json() : null;
        ok = res.ok;
        if (ok && result) {
            message = result.message
        } else {
            message = "Une erreur est survenue. Veuillez réessayer plus tard.";
        }
        if (ok) { email = ""; name = ""; }
    }
</script>

<main class="container">
    <article>
        <header>
            <strong>Mandats 18m</strong>
        </header>
        <p>Inscrivez-vous pour être notifié quand un nouveau mandat de <strong>tir à 18m</strong> est publié sur <a href="www.crnata.fr" target="_blank">CRNATA</a>.</p>
        <form onsubmit={submit}>
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
        <footer>
            <details class="no-margin">
                <summary>Les mandats disponibles</summary>
                <div>
                    <p>
                        <strong>Total:</strong> {data.meta.total} —
                        <small>Mise à jour le {data.savedAt}</small>
                    </p>
                </div>
                {#if message}
                    <span>{message}</span>
                {/if}
                <ul>
                    {#each data.events as s}
                        <li><a href="{s[0]}" target="_blank">{s[1]}</a> {s[2]}</li>
                    {/each}
                </ul>
            </details>
        </footer>
    </article>
</main>

