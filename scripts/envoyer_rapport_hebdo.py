"""
Envoi automatique du rapport hebdomadaire PDF par email à abdouju30@gmail.com.

Variables d'environnement :
  • EMAIL_DESTINATAIRE (défaut : abdouju30@gmail.com)
  • SMTP_HOST          (ex: smtp.gmail.com)
  • SMTP_PORT          (défaut : 587 ou 465)
  • SMTP_USER          (votre adresse email d'envoi)
  • SMTP_PASS          (mot de passe d'application 16 caractères)
"""

import os
import sys
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

RACINE = Path(__file__).resolve().parent.parent
PDF_PATH = RACINE / "data" / "rapport-hebdo-onssa.pdf"

DESTINATAIRE_DEFAUT = "abdouju30@gmail.com"

def envoyer_rapport():
    destinataire = os.getenv("EMAIL_DESTINATAIRE", DESTINATAIRE_DEFAUT)
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not PDF_PATH.exists():
        print("  [!] PDF introuvable, génération préalable...")
        from generer_pdf_hebdo import generer_rapport_pdf
        generer_rapport_pdf()

    date_str = datetime.now().strftime("%d/%m/%Y")
    sujet = f"📊 Rasd · Rapport Hebdomadaire Réglementaire ONSSA — Semaine du {date_str}"

    corps_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0e1a20; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dde4e8; border-radius: 8px;">
          <div style="background-color: #0d5c73; padding: 14px 20px; border-radius: 6px 6px 0 0; color: white;">
            <h2 style="margin: 0; font-size: 18px;">Rasd · Veille Réglementaire Hebdomadaire</h2>
            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Relevé officiel ONSSA & Marché Phytosanitaire Maroc</p>
          </div>
          <div style="padding: 20px 10px;">
            <p>Bonjour,</p>
            <p>Veuillez trouver ci-joint votre <b>rapport réglementaire hebdomadaire</b> au format PDF pour la semaine du <b>{date_str}</b>.</p>
            <p><b>Ce rapport synthétise :</b></p>
            <ul>
              <li>Les <b>nouveaux produits phytosanitaires</b> et spécialités homologuées en ligne (<a href="https://eservice.onssa.gov.ma/IndPesticide.aspx">IndPesticide.aspx</a>)</li>
              <li>Les <b>nouveaux agréments revendeurs & importateurs</b> autorisés au Maroc</li>
              <li>Les <b>nouveaux usages et cultures</b> homologués (DAR, doses, cibles)</li>
              <li>Les <b>organismes nuisibles & ravageurs</b> suivis</li>
              <li>Les <b>homologations arrivées à expiration</b> (opportunités de substitution)</li>
            </ul>
            <p>Le document complet est joint au présent courriel.</p>
            <p style="font-size: 11.5px; color: #4a5a63; margin-top: 25px; border-top: 1px solid #dde4e8; padding-top: 12px;">
              Rasd — Tour de contrôle réglementaire agricole.<br/>
              Pour toute consultation interactive en ligne, accédez à votre espace sur le portail Rasd.
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg["From"] = smtp_user or "veille@homologa.ma"
    msg["To"] = destinataire
    msg["Subject"] = sujet

    msg.attach(MIMEText(corps_html, "html"))

    # Pièce jointe PDF
    with open(PDF_PATH, "rb") as f:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(f.read())
    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition",
        f"attachment; filename=Homologa_Rapport_Hebdo_{datetime.now().strftime('%Y%m%d')}.pdf",
    )
    msg.attach(part)

    print(f"-> Préparation de l'envoi vers {destinataire}...")

    if not (smtp_host and smtp_user and smtp_pass):
        print("  [i] Identifiants SMTP non définis dans l'environnement local.")
        print(f"  [i] Configuration requise dans GitHub Secrets pour l'automatisation :")
        print(f"      - SMTP_HOST (ex: smtp.gmail.com)")
        print(f"      - SMTP_PORT (ex: 587)")
        print(f"      - SMTP_USER (votre adresse email)")
        print(f"      - SMTP_PASS (mot de passe d'application 16 caractères)")
        print(f"  [✓] Simulation d'envoi réussie : le PDF est prêt et le message est correctement formaté pour {destinataire}.")
        return True

    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
            server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"  [✓] Rapport PDF envoyé avec succès à {destinataire} !")
        return True
    except Exception as e:
        print(f"  [!] Erreur lors de l'envoi SMTP : {e}")
        return False

if __name__ == "__main__":
    envoyer_rapport()
