<script>
    export let data;

    async function handleRelance(email) {
        const res = await fetch('/api/subscribers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, token: data.token, status: 'pending' })
        });
        const result = await res.json();
        if (result.status === 200) window.location.reload();
    }

    async function handleUnsubscribe(email) {
        const res = await fetch('/api/subscribers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, token: data.token, status: 'unsubscribed' }),
        });
        const result = await res.json();
        if (result.status === 200) window.location.reload();
    }

    async function handleDelete(email) {
        const res = await fetch('/api/subscribers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, token: data.token })
        });
        const result = await res.json();
        if (result.status === 200) window.location.reload();
    }
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
            <strong>En attente:</strong> {data.meta.pending}  —
            <strong>Désinscrits:</strong> {data.meta.unsubscribed}
        </p>

        <table>
            <thead>
            <tr>
                <th>Email</th>
                <th>Catégories</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
            {#each data.subscribers as s}
                <tr>
                    <td><code>{s.email}</code></td>
                    <td>{s.categories.join(", ")}</td>
                    <td>{s.status}</td>
                    <td>{s.ts ? new Date(s.ts).toLocaleString('fr-FR') : "—"}</td>
                    {#if s.status === "pending"}
                        <td><button onclick={() => handleRelance(s.email)}>Relancer</button></td>
                    {/if}
                    {#if s.status === "confirmed"}
                        <td><button onclick={() => handleUnsubscribe(s.email)}>Désinscrire</button></td>
                    {/if}
                    {#if s.status === "unsubscribed"}
                        <td><button onclick={() => handleDelete(s.email)}>Supprimer</button></td>
                    {/if}
                </tr>
            {/each}
            </tbody>
        </table>
    {/if}
</article>