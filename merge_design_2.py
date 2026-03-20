import re

with open('nouveau_design.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace button targets
html = html.replace('href="#demo"', 'href="javascript:openForm()"')
html = html.replace('href="mailto:contact@safe-pilotage-prive.fr" class="btn btn--primary"', 'href="javascript:openForm()" class="btn btn--primary"')

# 2. Add Modal CSS class
modal_css = """
    .lightbox {
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); justify-content: center; align-items: center; opacity: 0; transition: opacity 0.3s ease;
    }
    .lightbox.show {
      opacity: 1;
    }
    .form-option {
      display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1rem; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s ease;
    }
    .form-option:hover {
      background: rgba(255,255,255,0.08); border-color: rgba(37, 99, 235, 0.4);
    }
"""
if '</style>' in html:
    html = html.replace('</style>', f'{modal_css}\n  </style>')

# 3. Add Modal HTML body just before JS scripts AND inside </body>
modal_html = """
    <!-- Modale Typeform Intégrée -->
    <div id="typeform-modal" class="lightbox" onclick="closeForm(event)">
        <div class="form-container" onclick="event.stopPropagation()" style="background: var(--navy-mid); padding: 3rem; border-radius: 20px; border: 1px solid rgba(37, 99, 235, 0.2); width: 100%; max-width: 600px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); font-family: var(--font-body); position: relative;">
            <button style="position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; color: white; cursor: pointer;" onclick="closeForm({target: {id: 'typeform-modal'}})">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div id="step-1" class="form-step">
                <div class="label label--blue">Étape 1 sur 3</div>
                <h3 style="margin-bottom: 1.5rem; font-size: 1.4rem; color: white;">Quelle est la taille de votre organisation ?</h3>
                <div class="radio-group" style="display: flex; flex-direction: column; gap: 0.8rem;">
                    <label class="form-option" style="color: white;"><input type="radio" name="size" value="1-15"> Moins de 15 collaborateurs</label>
                    <label class="form-option" style="color: white;"><input type="radio" name="size" value="16-50"> Entre 16 et 50 collaborateurs</label>
                    <label class="form-option" style="color: white;"><input type="radio" name="size" value="50+"> Plus de 50 collaborateurs</label>
                </div>
                <button onclick="nextStep(2)" class="btn btn--primary" style="width: 100%; justify-content: center; margin-top: 2rem;">Continuer ➔</button>
            </div>
            
            <div id="step-2" class="form-step" style="display: none;">
                <div class="label label--blue">Étape 2 sur 3</div>
                <h3 style="margin-bottom: 1.5rem; font-size: 1.4rem; color: white;">Quel département est prioritaire ?</h3>
                <select id="lead-department" style="width: 100%; padding: 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; margin-bottom: 1rem; font-family: inherit; font-size: 1.05rem; cursor: pointer; appearance: auto;">
                    <option value="" disabled selected>Sélectionnez un département...</option>
                    <option value="Direction / Stratégie">👑 Direction / Stratégie</option>
                    <option value="Ventes / Commercial">📈 Ventes / Commercial</option>
                    <option value="Ressources Humaines">👥 Ressources Humaines (Paie...)</option>
                    <option value="Comptabilité / Finance">📊 Comptabilité / Finance</option>
                    <option value="Juridique / Compliance">⚖️ Juridique / Compliance</option>
                    <option value="Opérations / RAG Interne">📚 Opérations (Base de savoir)</option>
                    <option value="Autre">💡 Autre besoin stratégique</option>
                </select>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button onclick="nextStep(1)" class="btn btn--outline" style="flex: 1; border-color: rgba(255,255,255,0.1); color: white;">Retour</button>
                    <button onclick="nextStep(3)" class="btn btn--primary" style="flex: 2; justify-content: center;">Continuer ➔</button>
                </div>
            </div>
            
            <div id="step-3" class="form-step" style="display: none;">
                <div class="label label--blue" style="background: rgba(37, 99, 235, 0.2);">Dernière Étape</div>
                <h3 style="margin-bottom: 1.5rem; font-size: 1.4rem; color: white;">Où pouvons-nous vous recontacter ?</h3>
                <input type="text" id="lead-name" required placeholder="Votre Prénom et Nom" style="width: 100%; padding: 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; margin-bottom: 1rem; font-family: inherit; font-size: 1rem;">
                <input type="email" id="lead-email" required placeholder="Email professionnel" style="width: 100%; padding: 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; margin-bottom: 1rem; font-family: inherit; font-size: 1rem;">
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button onclick="nextStep(2)" class="btn btn--outline" style="flex: 1; border-color: rgba(255,255,255,0.1); color: white;">Retour</button>
                    <button id="submit-btn" onclick="submitForm()" class="btn btn--primary" style="flex: 2; justify-content: center; font-weight: 700;">Soumettre ma demande</button>
                </div>
            </div>
            
        </div>
    </div>
"""

js_logic = """
        // Modal Formulaire "Typeform" & Brevo Logic
        function openForm() {
            const modal = document.getElementById('typeform-modal');
            if(modal){
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
                nextStep(1); // Reset to first step
            }
        }
        
        function closeForm(e) {
            if(e && e.target.id !== 'typeform-modal' && e.target.tagName !== 'svg' && e.target.tagName !== 'line' && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) return;
            const modal = document.getElementById('typeform-modal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        }

        function nextStep(stepNumber) {
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'none';
            document.getElementById('step-3').style.display = 'none';
            document.getElementById('step-' + stepNumber).style.display = 'block';
        }

        function submitForm() {
            const size = document.querySelector('input[name="size"]:checked')?.value || 'Non précisé';
            const selectEl = document.getElementById('lead-department');
            const usecase = (selectEl && selectEl.value) ? selectEl.value : 'Non précisé';
            const name = document.getElementById('lead-name').value;
            const email = document.getElementById('lead-email').value;
            
            if (!name || !email) {
                alert("Merci de renseigner votre prénom, nom et une adresse email.");
                return;
            }

            const btn = document.getElementById('submit-btn');
            btn.innerText = "Envoi en cours...";
            btn.disabled = true;
            btn.style.opacity = "0.7";

            // Envoi via le lien formulaire Brevo dans une Iframe invisible
            let iframe = document.getElementById('brevo-iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.name = 'brevo-iframe';
                iframe.id = 'brevo-iframe';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'https://315b5753.sibforms.com/serve/MUIFAMK0lOYlsV-Aqzo1LDjfpCglpBr-Txt78xkq53MWdPT5rAnBpM4SWNzzfkvZ_YbGZnHuvICPR-4TjAZTPptPnENMd9InUti4NEF2ZBGMvVxXwGmKI3Wmp2WsJeQV5L7g2MCJILixEJqXNEs7NsnG9ymCRhHQHzTRYB0l5aERTNfEzOu_45KmjyExKzomuDuOB9KQk7lp4bzbCg==';
            form.target = 'brevo-iframe';

            function createHiddenInput(name, value) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
                return input;
            }

            form.appendChild(createHiddenInput('EMAIL', email));
            form.appendChild(createHiddenInput('NOM', name));
            form.appendChild(createHiddenInput('TAILLE_ENTREPRISE', size));
            form.appendChild(createHiddenInput('DEPARTEMENT_CONCERNE', usecase));

            document.body.appendChild(form);
            form.submit();

            // Simulate email confirmation display
            setTimeout(() => {
                document.getElementById('step-1').style.display = 'none';
                document.getElementById('step-2').style.display = 'none';
                document.getElementById('step-3').style.display = 'block';
                document.getElementById('step-3').innerHTML = `
                    <div style="text-align: center; padding: 2rem 0;">
                        <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="#10B981" stroke-width="2" style="margin-bottom: 1.5rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <h3 style="color: white; font-size: 1.5rem; margin-bottom: 1rem;">Demande envoyée avec succès</h3>
                        <p style="color: rgba(255,255,255,0.6); font-size: 1rem; margin-bottom: 2rem; line-height: 1.5;">Vérifiez votre boîte mail, une confirmation vient de vous être envoyée.<br>Notre direction vous recontactera sous peu.</p>
                        <button onclick="closeForm({target: {id: 'typeform-modal'}})" class="btn btn--outline" style="border-color: rgba(255,255,255,0.2); color: white;">Fermer la fenêtre</button>
                    </div>
                `;
                document.body.removeChild(form);
            }, 1500);
        }
"""

html = html.replace('</body>', f'{modal_html}\n</body>')
html = html.replace('</script>', f'{js_logic}\n</script>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
