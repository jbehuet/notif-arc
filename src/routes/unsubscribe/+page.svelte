<script>
    export let form;
</script>

<article>
    <h1>Se désinscrire</h1>
    <p>
        Entrez votre adresse email pour vous désinscrire de NotifArc.<br />
        Vous ne recevrez plus de notifications.
    </p>

    <form method="post">
        <fieldset role="group">
            <input type="email" name="email" placeholder="email@exemple.fr" required />
            <button type="submit">Désinscrire</button>
        </fieldset>
    </form>

    {#if form}
        <p class={form.success ? 'success' : 'error'}>
            {form.message}
        </p>
    {/if}
</article>