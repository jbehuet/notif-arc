<script>
    export let categories = [
        { slug: "tir18m", label: "Tir à 18m", subtitle: "Compétitions en salle", emoji: "🎯", disabled: false },
        { slug: "tae_50_70", label: "Tir extérieur (à venir)", subtitle: "50/70m plein air", emoji: "☀️" , disabled : true }
    ];

    /** tableau des slugs sélectionnés (bindable) */
    export let value = ["tir18m"];

    /** nom du champ pour le POST (tableau) */
    export let name = "categories[]";
</script>

<section>
    <header class="grid">
        <strong>Catégories</strong>
    </header>

    <div class="grid cards">
        {#each categories as c}
            <!-- Le label rend toute la carte cliquable -->
            <label class={"mandate-card " + (c.disabled ? "disabled" : "")}>
                <!-- Le name[] permet un tableau au POST -->
                <input
                        type="checkbox"
                        name={name}
                        value={c.slug}
                        bind:group={value}
                        aria-label={c.label}
                        disabled={c.disabled}
                />
                <div class="card">
                    <div class="title">
                        <span class="emoji" aria-hidden="true">{c.emoji}</span>
                        <strong>{c.label}</strong>
                    </div>
                    {#if c.subtitle}<small class="subtitle">{c.subtitle}</small>{/if}
                </div>
            </label>
        {/each}
    </div>
</section>

<style>
    /* Layout */
    section { gap: var(--spacing, 1rem); display: grid; }
    header.grid { grid-template-columns: 1fr auto; align-items: center; }

    /* grille des cartes (Pico a déjà .grid, on fixe le min) */
    .cards {
        grid-template-columns: repeat(auto-fill, minmax(var(11rem), 1fr));
    }

    /* carte cliquable + état sélectionné */
    .mandate-card {
        position: relative;
        display: block;
        width: auto;
    }
    .mandate-card input {
        /* on laisse l’input accessible mais discret */
        position: absolute;
        inset: .5rem .5rem auto auto;
        transform: scale(1.1);
        z-index: 2;
    }
    .disabled{
        .card{
            cursor: not-allowed;
            opacity:0.5;
        }
    }

    .mandate-card .card {
        padding: 1rem;
        background: var(--card-bg, #f8fafc);
        transition: border-color .15s, background-color .15s, box-shadow .15s;
        box-shadow: 0 1px 0 rgba(0,0,0,.02);
    }
    .mandate-card:hover .card {
        border-color: var(--primary-focus, #93c5fd);
    }

    /* Sélection (utilise :has, moderne et très pratique) */
    .mandate-card:has(input:checked) .card {
        border-color: var(--primary, #3a9092);
        background: color-mix(in oklab, var(--primary, #3a9092) 8%, white);
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary, #3a9092) 20%, transparent);
    }

    .title { display:flex; align-items:center; gap:.5rem; margin-bottom:.25rem; }
    .emoji { font-size: 1.25rem; line-height: 1; }
    .subtitle { color: var(--pico-muted-color); }


    input[type="checkbox"]:checked{
        background-color: #3a9092;
        border-color: #3a9092;
    }
    input[type="checkbox"]:focus{
        box-shadow: none;
        border-color: #3a9092;
    }
</style>