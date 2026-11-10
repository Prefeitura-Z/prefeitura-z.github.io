require "PRZOmegaCatalog"
PRZOmegaWeapons.CampaignConfig = {
    schema = 1,
    modDataKey = "PRZ_WEAPONS_OMEGA_CAMPAIGN_V1",
    -- Same identity as PrefeituraOmega and Pager: account username, not character.
    identity = "username",
    repeatAfterCollection = true,
    preferUnawarded = true,
    deadlineHours = 8760, -- Pager maximum; expiration keeps this campaign's progress.
    stages = {
        {title="1/5 - Reconhecimento Atlas", objective="occult", target=10,
            description="Neutralize 10 infectados ocultistas dentro das salas subterraneas do Atlas."},
        {title="2/5 - Contencao do laboratorio", objective="occult", target=20, maxZ=-3,
            description="Elimine outros 20 ocultistas no Atlas, do piso -3 para baixo."},
        {title="3/5 - Cacada as mutacoes", objective="mutant", target=5,
            description="Neutralize 5 mutantes do Atlas; Tanks tambem contam nesta etapa."},
        {title="4/5 - Ruptura das mutacoes", objective="mutant", target=10, maxZ=-6,
            description="Neutralize outros 10 mutantes nos pisos -6 a -8 do Atlas; Tanks tambem contam."},
        {title="5/5 - Protocolo de extracao", objective="all", target=30,
            description="Conclua a limpeza com outros 30 infectados especiais do Atlas. Bashar liberara um unico dossie de fabricacao."},
    },
}
