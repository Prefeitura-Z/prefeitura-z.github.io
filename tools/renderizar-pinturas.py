"""Renderiza prévias com as malhas FBX e as texturas originais dos mods."""
import json
import re
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def importar(arquivo):
    antes = set(bpy.data.objects)
    bpy.ops.wm.fbx_import(filepath=str(arquivo), use_anim=False)
    return {re.sub(r'\.\d{3}$', '', o.name): o for o in bpy.data.objects if o not in antes and o.type == 'MESH'}


def malha(obj, material, posicao=None, escala=100, espelhar=False):
    avaliado = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    matriz = Matrix.Scale(escala, 4) @ avaliado.matrix_world
    if espelhar:
        matriz = Matrix.Diagonal((-1, 1, 1, 1)) @ matriz
    mesh = bpy.data.meshes.new_from_object(avaliado)
    copia = bpy.data.objects.new(obj.name + '-previa', mesh)
    bpy.context.scene.collection.objects.link(copia)
    copia.data.transform(matriz)
    copia.data.materials.clear()
    copia.data.materials.append(material)
    if posicao is not None:
        if posicao[0] < 0:
            copia.rotation_euler.z = 3.141592653589793
        copia.location = posicao
    return copia


def material(nome, textura=None):
    mat = bpy.data.materials.new(nome)
    mat.use_nodes = True
    no = mat.node_tree.nodes.new('ShaderNodeTexImage')
    mat.node_tree.nodes.active = no
    if textura:
        no.image = bpy.data.images.load(str(textura), check_existing=True)
    return mat, no


def preparar_cena(mods, config):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    casca, no = material('Pintura')
    pecas = []
    malhas = {}
    materiais = {}
    for parte in config['pecas']:
        arquivo = parte['arquivo']
        if arquivo not in malhas:
            malhas[arquivo] = importar(mods / arquivo)
        formas = malhas[arquivo]
        textura = parte.get('textura')
        if textura and textura not in materiais:
            materiais[textura] = material(textura, mods / textura)[0]
        mat = materiais.get(textura, casca)
        objetos = [formas[parte['malha']]] if parte.get('malha') else formas.values()
        for objeto in objetos:
            pecas.append(malha(objeto, mat, parte.get('posicao'), parte.get('escala', 100), parte.get('espelhar', False)))

    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj not in pecas:
            obj.hide_render = True
    bpy.context.view_layer.update()
    vertices = [obj.matrix_world @ Vector(v) for obj in pecas for v in obj.bound_box]
    centro = Vector([(min(v[i] for v in vertices) + max(v[i] for v in vertices)) / 2 for i in range(3)])
    camera = bpy.data.objects.new('Câmera', bpy.data.cameras.new('Câmera'))
    bpy.context.scene.collection.objects.link(camera)
    camera.location = centro + Vector((6, 4, 3.5))
    camera.rotation_euler = (centro - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    rotacao = camera.rotation_euler.to_quaternion()
    projecao = [rotacao.inverted() @ (v - centro) for v in vertices]
    esquerda, direita = min(v.x for v in projecao), max(v.x for v in projecao)
    baixo, cima = min(v.y for v in projecao), max(v.y for v in projecao)
    camera.location += rotacao @ Vector(((esquerda + direita) / 2, (baixo + cima) / 2, 0))
    camera.data.ortho_scale = max(direita - esquerda, (cima - baixo) * 720 / 420) * 1.12
    cena = bpy.context.scene
    cena.camera = camera
    cena.render.engine = 'BLENDER_WORKBENCH'
    cena.display.shading.light = 'STUDIO'
    cena.display.shading.studio_light = 'paint.sl'
    cena.display.shading.color_type = 'TEXTURE'
    cena.display.shading.show_shadows = True
    cena.display.shading.show_cavity = True
    cena.display.shading.cavity_type = 'BOTH'
    cena.world = bpy.data.worlds.new('Fundo')
    cena.world.color = (0.015, 0.017, 0.015)
    cena.view_settings.view_transform = 'Standard'
    cena.render.resolution_x = 720
    cena.render.resolution_y = 420
    cena.render.resolution_percentage = 100
    cena.render.image_settings.file_format = 'JPEG'
    cena.render.image_settings.quality = 85
    return cena, no


def main(args):
    mods, fontes, configuracao = map(Path, args[:3])
    amostra = '--amostra' in args[3:]
    dados = json.loads(fontes.read_text(encoding='utf-8'))
    configs = json.loads(configuracao.read_text(encoding='utf-8'))
    anterior = None
    for entrada in dados:
        id_veiculo = entrada['id']
        if amostra and id_veiculo == anterior:
            continue
        if id_veiculo != anterior:
            cena, no = preparar_cena(mods, configs[id_veiculo])
            anterior = id_veiculo
        no.image = bpy.data.images.load(entrada['arquivo'], check_existing=True)
        cena.render.filepath = entrada['destino']
        bpy.ops.render.render(write_still=True)


main(sys.argv[sys.argv.index('--') + 1:])
