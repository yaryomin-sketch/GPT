from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'node_modules/babylonjs';p.mkdir(parents=True,exist_ok=True)
(p/'index.js').write_text("module.exports=require('../../vendor/babylon.js');\n")
print('Local Babylon module alias ready; no network needed.')
