<script>
	import '$styles/main.scss';
</script>
<header class="container">
    <nav>
        <ul><li class="logo"><a href="/" class="item-center"><img src="/notif-arc-logo-512.png" width="68" /><strong>NotifArc</strong></a>
            <small>Ne manquez plus aucune compétition.</small>
        </li></ul>
    </nav>
</header>

<main class="container">
    <slot />
    <footer class="container" style="text-align: right;">
        <small>par <a href="mailto:jbehuet@gmail.com">Jerome B.</a> © {new Date().getFullYear()} — NotifArc v0.3.1</small>
    </footer>
</main>