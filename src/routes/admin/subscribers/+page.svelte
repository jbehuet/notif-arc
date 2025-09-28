<script>
    export let data;
    let q = ""; // recherche client
    $: filtered = (data.subscribers || []).filter((s) => {
        const hay = `${s.email || ""} ${s.status || ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
    });
</script>

<article>
    <header>
        <h1>Admin — Souscriptions</h1>
        {#if data.status === 401}
            <p class="contrast">Accès refusé (token invalide ou manquant).</p>
            <p>Ajoutez <code>?token=VOTRE_TOKEN</code> à l’URL.</p>
        {/if}
    </header>

    {#if data.status !== 401}
        <p>
            <strong>Total:</strong> {data.meta.total} —
            <strong>Confirmés:</strong> {data.meta.confirmed} —
            <strong>En attente:</strong> {data.meta.pending}
        </p>

        {#if filtered.length === 0}
            <p>Aucun abonné trouvé.</p>
        {:else}
            <table>
                <thead>
                <tr>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Inscription</th>
                    <th>Confirmé</th>
                </tr>
                </thead>
                <tbody>
                {#each filtered as s}
                    <tr>
                        <td><code>{s.email}</code></td>
                        <td>{s.status}</td>
                        <td>{s.ts ? new Date(s.ts).toLocaleString('fr-FR') : "—"}</td>
                        <td>{s.confirmedAt ? new Date(s.confirmedAt).toLocaleString('fr-FR') : "—"}</td>
                    </tr>
                {/each}
                </tbody>
            </table>
        {/if}
    {/if}
</article>