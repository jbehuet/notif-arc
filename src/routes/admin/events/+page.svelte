<script>
    export let data;
    let message = "", ok = false;

    async function checkManuel() {
        const res = await fetch("https://www.notif-arc.fr/.netlify/functions/check-crnata-manual", {
            method: "GET",
            headers: {"Content-Type":"application/json"}
        });

        const data = res.ok ? await res.json() : null;
        ok = res.ok;
        if (ok && data) {
            message = data
        } else {
            message = "Une erreur est survenue.";
        }
    }
</script>

<article>
    <header>
        <h1>Admin — Évènements</h1>
        {#if data.status === 401}
            <p class="contrast">Accès refusé (token invalide ou manquant).</p>
        {/if}
    </header>

    {#if data.status !== 401}
        <div class="items-space-between">
            <p>
                <strong>Total:</strong> {data.meta.total} —
                <small>Mise à jour le {data.savedAt}</small>
            </p>
            <button class="outline small-button" onclick={checkManuel}>🔄 Check manuel</button>
        </div>
        {#if message}
        <span>{message}</span>
        {/if}
        <ul>
            {#each data.events as s}
              <li><a href="{s[0]}" target="_blank">{s[1]}</a> {s[2]}</li>
            {/each}
        </ul>
    {/if}
</article>