<script>
    export let data;
</script>

<article>
    <header>
        <h1>Admin — Souscriptions</h1>
        {#if data.status === 401}
            <p class="contrast">Accès refusé (token invalide ou manquant).</p>
        {/if}
    </header>

    {#if data.status !== 401}
        <p>
            <strong>Total:</strong> {data.meta.total} —
            <strong>Confirmés:</strong> {data.meta.confirmed} —
            <strong>En attente:</strong> {data.meta.pending}
        </p>

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
            {#each data.subscribers as s}
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
</article>