import importlib.util, json, unittest
import io, os
from contextlib import contextmanager
from unittest.mock import patch
from datetime import datetime, timezone
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'.github/scripts/publicar_dados.py'
spec=importlib.util.spec_from_file_location('publish',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class Airdrops(unittest.TestCase):
    def test_pterodactyl_without_atomic_replace_preserves_complete_snapshot(self):
        payload=b'V|2|1800000000\nD|Ana%20Maria|900000000000000001\nEND|2|1800000000\n'
        files={}
        class SFTP:
            @contextmanager
            def open(self,path,mode):
                value=io.BytesIO();yield value;files[path]=value.getvalue()
            def posix_rename(self,source,dest):raise OSError('failure')
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return payload
        with patch.dict(os.environ,{'SITE_API':'https://example.test','SITE_BRIDGE_SECRET':'local-only','PTERO_SFTP_HOST':'example.test'}),patch.object(module,'_sftp',SFTP()),patch.object(module,'ler_arquivo_sftp',return_value=('V|1\n',None)),patch.object(module.urllib.request,'urlopen',return_value=Response()):
            module.ponte_site('/Lua')
        self.assertEqual(files['/Lua/PrefeituraZSiteInbox.txt'],payload)
    def test_allowlist_hides_private_fields_and_accepts_two_public_drops(self):
        t=1800000000
        a=dict(id='one',x=10000,y=9000,expiraEm=t+5400,zona='Atlas',risco=3,login='private',discord_id='private')
        out=module.airdrops_publicos(json.dumps(dict(geradoEm=t,ativos=[a,{**a,'id':'two'}])),datetime.fromtimestamp(t,timezone.utc))
        self.assertEqual(len(out['ativos']),2)
        self.assertNotIn('private',json.dumps(out))
    def test_stale_expired_future_and_malformed(self):
        t=1800000000;now=datetime.fromtimestamp(t,timezone.utc)
        for text in ['broken','[]',json.dumps(dict(geradoEm=t-901,ativos=[])),json.dumps(dict(geradoEm=t+1,ativos=[]))]:
            self.assertEqual(module.airdrops_publicos(text,now)['ativos'],[])
        self.assertEqual(module.airdrops_publicos(json.dumps(dict(geradoEm=t,ativos=[dict(x=1,y=2,expiraEm=t)])),now)['ativos'],[])
    def test_optional_airdrops_dont_break_existing_public_feed(self):
        d=module.montar(None,None,None,None,None)
        self.assertEqual(d['airdrops']['ativos'],[])
        self.assertEqual(d['ranking'],[])

if __name__=='__main__':unittest.main()
