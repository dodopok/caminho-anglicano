import type { LiturgyService } from '../types'

interface LiturgyDocumentData {
  service: LiturgyService
  texts?: {
    confession?: string
    absolution?: string
    eucharisticPrayer?: string
    creed?: string
    blessing?: string
    dismissal?: string
  }
}

/**
 * Gera HTML formatado para a ordem de culto
 */
export function generateLiturgyHTML(data: LiturgyDocumentData): string {
  const { service, texts } = data

  // Helper para encontrar pessoa de um ministério
  const findPersonForMinistry = (ministrySlug: string) => {
    const schedule = service.schedules?.find(s =>
      s.ministry?.slug === ministrySlug
    )
    return schedule?.person?.name || ''
  }

  // Gerar seções
  const sections: string[] = []

  // Título
  sections.push(`
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
        ${service.liturgical_week || 'Culto'}
      </h1>
      <p style="font-size: 14px; color: #666;">
        ${new Date(service.service_date).toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
        ${service.service_time ? ` - ${service.service_time.substring(0, 5)}` : ''}
      </p>
    </div>
  `)

  // Abertura/Acolhida
  const acolhidaPerson = findPersonForMinistry('acolhida')
  if (acolhidaPerson) {
    sections.push(`
      <h3>Abertura / Acolhida${service.collect_text ? ' / Coleta' : ''}: ${acolhidaPerson}</h3>
      <p>☩ Em nome do Pai, do Filho e do Espírito Santo.</p>
    `)

    if (service.collect_text) {
      sections.push(`<p><strong>Coleta:</strong> ${service.collect_text}</p>`)
    }
  }

  // Músicas
  if (service.songs && service.songs.length > 0) {
    sections.push(`
      <h3>Músicas</h3>
      <ul>
        ${service.songs.map(song => `<li>${song}</li>`).join('\n')}
      </ul>
    `)
  }

  // Confissão
  const confissaoPerson = findPersonForMinistry('confissao')
  if (confissaoPerson) {
    sections.push(`
      <h3>Confissão: ${confissaoPerson}</h3>
      <p>${texts?.confession || 'Onipotente Deus, nosso Pai, reconhecemos e confessamos nossos muitos pecados, que temos cometido por pensamentos, palavras, obras e omissões, contra ti, contra nosso próximo e contra nós mesmos. Concede-nos verdadeiro arrependimento, e, por amor de teu Filho, nosso Senhor Jesus Cristo, perdoa-nos todo o passado, e dá-nos a graça de te servir com alegria, para a honra e glória do teu Nome.'}</p>
      <p><strong>Todos:</strong> Amém.<br>
      Senhor, tem piedade de nós<br>
      Cristo, tem piedade de nós<br>
      Senhor, tem piedade de nós</p>
    `)
  }

  // Absolvição
  const absolvicaoPerson = findPersonForMinistry('absolvicao')
  if (absolvicaoPerson) {
    sections.push(`
      <h3>Absolvição: ${absolvicaoPerson}</h3>
      <p>${texts?.absolution || 'Deus Onipotente, nosso Pai Celestial, que, por sua grande misericórdia, promete o perdão a todos quantos, com sincero arrependimento e viva fé, a ele se convertem, vos perdoe e liberte de todos os vossos pecados, vos confirme e fortaleça em todo o bem, e vos preserve no caminho da vida eterna; mediante Jesus Cristo, nosso Senhor.'} Amém.</p>
    `)
  }

  // Leitura/Salmo
  const leituraPerson = findPersonForMinistry('leitura') || findPersonForMinistry('salmo')
  if (leituraPerson && service.readings) {
    sections.push(`
      <h3>Leitura: ${leituraPerson} - ${service.readings.psalm || ''}</h3>
      <p><strong>Leitor:</strong> Glória ao Pai, ao Filho e ao Espírito Santo.<br>
      <strong>Todos:</strong> Como era no princípio, é agora e será sempre, por todos os séculos. Amém.</p>
    `)
  }

  // Ofertório
  const ofertorioPerson = findPersonForMinistry('ofertorio')
  if (ofertorioPerson) {
    sections.push(`<h3>Ofertório - ${ofertorioPerson}</h3>`)
  }

  // Sermão
  const sermaoPerson = findPersonForMinistry('sermao')
  if (sermaoPerson && service.readings?.gospel) {
    sections.push(`<h3>Sermão - ${sermaoPerson} - ${service.readings.gospel}</h3>`)
  }

  // Eucaristia
  const presidindoPerson = findPersonForMinistry('presidindo')
  const servinoPerson = findPersonForMinistry('eucaristia-servindo')
  if (presidindoPerson) {
    sections.push(`
      <h3>Eucaristia - Presidindo: ${presidindoPerson}${servinoPerson ? `, Servindo: ${servinoPerson}` : ''}</h3>
      <p>O Espírito do Senhor seja convosco.<br>
      <strong>Seja também contigo.</strong><br>
      Elevai os corações.<br>
      <strong>Ao Senhor os elevamos.</strong><br>
      Demos graças ao Senhor, nosso Deus.<br>
      <strong>Assim fazê-lo é digno e justo.</strong></p>

      <p>É verdadeiramente digno, justo, racional e salutar que sempre, e em toda parte, te rendamos graças, ó Pai Onipotente, Criador do céu e da terra.</p>

      <p>Portanto, com os anjos e arcanjos e com toda a multidão celestial, que não cessam de proclamar a tua glória, jubilosos louvamos o teu Nome.</p>

      <p><strong>Santo, Santo, Santo, Senhor Deus do universo. Os céus e a terra estão plenos da tua glória. Glória te seja dada, ó Senhor Altíssimo. Hosana nas alturas! Bendito o que vem em Nome do Senhor! Hosana nas alturas!</strong></p>

      ${texts?.eucharisticPrayer || `
      <p>Toda a glória e ações de graças te sejam dadas, ó Deus Pai de infinito poder e amor, por toda a criação e por nos teres feito à tua própria imagem; e porque, tendo nós caído em pecado, enviaste misericordioso, em nosso socorro, teu único Filho Jesus Cristo, o qual, para nossa redenção, tomou sobre si a natureza humana e sofreu morte de cruz; e porque ele, pela oblação única de si mesmo, realizou um sacrifício perfeito, completo e suficiente pelo pecado de todo o mundo.</p>

      <p>Pois o Senhor Jesus, na noite em que foi traído, tomou o Pão, e, tendo dado graças, o partiu e deu aos seus discípulos, dizendo: "Tomai, comei, este é o meu Corpo, que é dado por vós; fazei isto em memória minha."</p>

      <p>E, depois da ceia, tomou o Cálice, e, tendo dado graças, lho entregou dizendo: "Bebei todos deste, porque este é o meu Sangue da Nova Aliança, que é derramado por vós e por muitos, para a remissão dos pecados. Fazei isto, quantas vezes o beberdes, em memória minha."</p>

      <p><strong>A tua morte, Senhor, nós anunciamos.<br>
      A tua ressurreição nós proclamamos.<br>
      E a tua vinda nós esperamos.<br>
      Vem, Senhor Jesus.</strong></p>

      <p>Portanto, ó Pai, seguindo o mandamento de teu Filho, comemoramos, até que Ele venha, a sua vida, paixão, morte, ressurreição e ascensão, dando-te graças pelas inumeráveis bênçãos que por Ele recebemos. E aqui te apresentamos, ó Senhor, a oferta de nós mesmos. E humildemente suplicamos que aceites este nosso sacrifício de louvor e ação de graças, e te dignes abençoar e santificar com teu Espírito Santo a este Pão e Vinho, para que nós, revestidos de tua graça e bênção celestial, sejamos unidos, com Cristo em tua Santa Igreja; mediante o mesmo teu Filho, nosso Senhor, por quem e com quem, na unidade do Espírito Santo, seja toda a honra e glória a ti, ó Pai Onipotente, por séculos sem fim. Amém.</p>
      `}

      <p>Como nos ensinou Cristo, o Salvador, agora nos animamos a dizer:<br>
      <strong>Pai nosso, que estás nos céus, santificado seja o teu nome. Venha o teu Reino, seja feita a tua vontade, assim na terra como no céu. O pão nosso de cada dia nos dá hoje. E perdoa-nos as nossas dívidas, assim como nós perdoamos aos nossos devedores. E não nos deixes cair em tentação, mas livra-nos do mal; pois teu é o Reino, e o poder, e a glória para sempre. Amém.</strong></p>

      <p>O Pão que partimos é a comunhão do Corpo de Cristo, e o Cálice que abençoamos é a comunhão do Sangue de Cristo.<br>
      <strong>Pois nós, embora muitos, somos um só corpo.</strong></p>
    `)
  }

  // Credo
  const credoPerson = findPersonForMinistry('credo')
  if (credoPerson) {
    sections.push(`
      <h3>Credo Apostólico - ${credoPerson}</h3>
      <p>${texts?.creed || 'Creio em Deus, Pai Todo poderoso, Criador do céu e da terra; Creio em Jesus Cristo, seu único Filho, nosso Senhor: o qual foi concebido por obra do Espírito Santo, Nasceu da Virgem Maria; padeceu sob o poder de Pôncio Pilatos, foi crucificado, morto e sepultado; Desceu ao Hades; ressuscitou ao terceiro dia; subiu ao céu, e está sentado à mão direita de Deus Pai Todo poderoso: donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo; na Santa Igreja Católica; na comunhão dos santos; na remissão dos pecados; na ressurreição do corpo; e na Vida Eterna.'} Amém.</p>
    `)
  }

  // Avisos
  const avisosPerson = findPersonForMinistry('avisos')
  if (avisosPerson || (service.notices && service.notices.length > 0)) {
    sections.push(`
      <h3>Avisos${avisosPerson ? ` - ${avisosPerson}` : ''}</h3>
      ${service.notices && service.notices.length > 0 ? `
        <ul>
          ${service.notices.map(notice => `<li>${notice}</li>`).join('\n')}
        </ul>
      ` : ''}
    `)
  }

  // Benção
  const bencaoPerson = findPersonForMinistry('bencao')
  if (bencaoPerson) {
    sections.push(`
      <h3>Benção - ${bencaoPerson}</h3>
      <p>${texts?.blessing || 'Cristo, nosso Rei, nos faça fiéis e fortes para cumprirmos a sua vontade, a fim de que possamos reinar com ele na glória; e a bênção de Deus onipotente, Pai, Filho e Espírito Santo, seja conosco, e conosco habite eternamente.'} Amém.</p>
    `)
  }

  // Despedida
  const despedidaPerson = findPersonForMinistry('despedida')
  if (despedidaPerson) {
    sections.push(`
      <h3>Despedida - ${despedidaPerson}</h3>
      <p>${texts?.dismissal || 'Vamos na paz de Cristo, sejamos fortes e corajosos no testemunho do evangelho entre todas as pessoas e sirvamos ao Senhor com alegria, no poder do Espírito Santo! Aleluia!'}</p>
    `)
  }

  // Juntar todas as seções
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${service.liturgical_week || 'Ordem de Culto'}</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          line-height: 1.6;
          color: #333;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        h3 {
          font-size: 16px;
          font-weight: bold;
          margin-top: 20px;
          margin-bottom: 10px;
          color: #5B21B6;
        }
        p {
          margin: 10px 0;
        }
        ul {
          margin: 10px 0;
          padding-left: 30px;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      ${sections.join('\n\n')}
    </body>
    </html>
  `

  return html
}

/**
 * Gera HTML simplificado para PDF (sem estilos complexos)
 */
export function generateLiturgyHTMLForPDF(data: LiturgyDocumentData): string {
  // Por enquanto, usa o mesmo HTML
  // No futuro, pode ter adaptações específicas para PDF
  return generateLiturgyHTML(data)
}
