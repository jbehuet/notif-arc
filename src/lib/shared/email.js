export const emailHeader = ()=>{
    return `
    <header>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;">
        <tr>
          <td style="vertical-align:middle;">
            <a href="https://www.notif-arc.fr" style="text-decoration:none;color:#3a9092;font-size:2rem;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://www.notif-arc.fr/notif-arc-logo-512.png" width="68" alt="logo" style="display:block;">
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <strong>NotifArc</strong>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0 0 2rem 0;font-size:1rem;color:#646b79;font-style:italic;">
              Ne manquez plus aucune compétition.
            </p>
          </td>
        </tr>
      </table>
    </header>
    `
}


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

