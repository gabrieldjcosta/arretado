# Apps · casca Android (Fase 1)

Casca Capacitor em `android/`, com o mesmo `dist/` do site. Nada de regra de negócio ali; ponte nativa só em `src/integracoes/conta/casca.ts`. Plano geral: `/mnt/project-files/planos-apps/plano-apps-windows-android-ios-2026-11-05.md`.

## Gerar o APK

Actions › **Android** › Run workflow. O arquivo `arretado-android.apk` sai no pré-lançamento "Android (prévia)" (aba Releases) e o resumo da execução mostra o SHA-256 da chave.
No celular: abrir o link da release no navegador, baixar o APK e instalar (liberar "instalar apps desconhecidos" para o navegador, uma vez).

## Chave de assinatura (uma vez, só no seu computador)

O repositório é público: a chave nunca entra no código. Sem os segredos abaixo o APK sai assinado com uma chave descartável, que serve para testar uma vez e **não atualiza por cima** do APK anterior (desinstalar antes).

```powershell
keytool -genkeypair -keystore arretado.jks -alias arretado -keyalg RSA -keysize 2048 -validity 10000
[Convert]::ToBase64String([IO.File]::ReadAllBytes("arretado.jks")) | Set-Clipboard
```

Em Settings › Secrets and variables › Actions, criar: `ANDROID_KEYSTORE_BASE64` (o que foi copiado), `ANDROID_KEYSTORE_SENHA`, `ANDROID_CHAVE_ALIAS` (`arretado`) e `ANDROID_CHAVE_SENHA`. Guardar `arretado.jks` e as senhas num cofre: perder a chave impede atualizar o app na Play.

## Login Google na casca

O login abre no navegador do sistema (o Google bloqueia WebView). A volta é o link `https://arretado.cc/?code=…`, que o app captura se o domínio estiver ligado ao Worker e `https://arretado.cc/.well-known/assetlinks.json` listar o pacote `cc.arretado.app` com o SHA-256 da chave de assinatura. Sem isso o link abre no navegador e o login não conclui (e-mail com código continua valendo).

## Link de volta do login (decidido)

Gabriel (15/11/2026, cartão): o app captura `https://arretado.cc/` inteiro, como está. Com o link verificado, qualquer link do site abre o app. O Supabase não muda por isso.

## Pendente nesta fase

S Pen: precisa de teste no aparelho, sem código às cegas. O lembrete diário não confere o alarme com o sistema ao abrir (forçar parada ou revogar a permissão deixam a tela dizendo "ligado"): ajuste futuro.
