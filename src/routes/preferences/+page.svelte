<script>
    import CategorySelector from "$lib/components/categorySelector.svelte";
    // variable locale bindable
    let categorieSelected = [];
    export let data;
    // initialiser une seule fois depuis data.user.categories
    $: if (data?.user && categorieSelected.length === 0) {
        categorieSelected = [...(data.user.categories ?? [])];
    }

    let email = "", message = "", ok = false, honey = "";
    async function submit(e) {
        e.preventDefault();
        message = "";
        ok = false;
        if (categorieSelected.length === 0) {
            message = "Veuillez sélectionner au moins une catégorie";
            return;
        }

        const res = await fetch("/api/preferences", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ email:data.user.email, token:data.user.token, categories: categorieSelected, honey })
        });

        const result = res.ok ? await res.json() : null;
        ok = res.ok;
        if (ok && result) {
            message = result.message
        } else {
            message = "Une erreur est survenue. Veuillez réessayer plus tard.";
        }
        if (ok) { email = ""; }
    }


</script>

<main class="container">
    <article>
        <header>
            <strong>Gérer mes préférences</strong>
            <span>⚙️</span>
        </header>
        {#if data.message}
            <p class={data.status}>
                {data.message}
            </p>
        {/if}
        <form onsubmit={submit} oninput={() => (message = '')}>
            {#if data.user}
                <CategorySelector bind:value={categorieSelected} />
            {/if}
            <!-- Honeypot anti-bot -->
            <input type="text" bind:value={honey} style="position:absolute;left:-10000px;top:-10000px" tabindex="-1" autocomplete="off" aria-hidden="true" />
            {#if message}
                <p role="status" class={ok ? "success" : "error"}>{message}</p>
            {/if}
            <div class="items-space-between">
                {#if !data.message}
                    <button>Mémoriser mes préférences</button>
                {/if}
                <a href="/" role="button" class="outline cancel">Retour à l'accueil</a>
            </div>
        </form>
    </article>
</main>