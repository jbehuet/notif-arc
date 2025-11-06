
export const emailFooter = (token)=> {
    return `
        <footer style="font-size:0.8rem;color:#666;">
          <p style="margin:0 0 0.25rem;">
          Cet outil évolue en continu, vos remarques sont précieuses.<br />
          Une suggestion ? Répondez à cet email !
          </p>
          <p style="margin:0 0 0.25rem;">
            Vous recevez cet email car vous êtes inscrit·e à
            <a href="https://www.notif-arc.fr" style="color:#3a9092;text-decoration:underline;">NotifArc</a>.
          </p>
          <p style="margin:0;">
            <a href="https://www.notif-arc.fr/unsubscribe?t=${token}" style="color:#e35252;text-decoration:underline;">Se désinscrire</a>
            &nbsp;•&nbsp;
            <a href="https://www.notif-arc.fr/preferences?t=${token}" style="color:#3a9092;text-decoration:underline;">Gérer mes préférences</a>
          </p>
        </footer>
    `
}

