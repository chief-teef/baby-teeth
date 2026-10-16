$ErrorActionPreference='Stop'
$families=@(
@('inter','Inter','inter'),@('source-sans','Source Sans 3','sourcesans3'),@('ibm-plex-mono','IBM Plex Mono','ibmplexmono'),@('patrick-hand','Patrick Hand','patrickhand'),@('permanent-marker','Permanent Marker','permanentmarker'),@('press-start-2p','Press Start 2P','pressstart2p'),@('vt323','VT323','vt323'),@('orbitron','Orbitron','orbitron'),@('audiowide','Audiowide','audiowide'),@('fredoka','Fredoka','fredoka'),@('pacifico','Pacifico','pacifico'),@('lobster','Lobster','lobster'),@('playfair-display','Playfair Display','playfairdisplay'),@('special-elite','Special Elite','specialelite'),@('unifrakturmaguntia','UnifrakturMaguntia','unifrakturmaguntia'),@('rubik-dirt','Rubik Dirt','rubikdirt'),@('dm-serif-display','DM Serif Display','dmserifdisplay'))
$inventory=@()
foreach($font in $families){
 $id,$family,$folder=$font
 $source='https://fonts.googleapis.com/css2?family='+[uri]::EscapeDataString($family)+':wght@400&display=swap'
 $css=(Invoke-WebRequest -Uri $source -Headers @{'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}).Content
 $blocks=[regex]::Matches($css,'(?s)/\* latin \*/\s*(@font-face\s*\{.*?\})')
 if(!$blocks.Count){throw "Missing Latin face: $id"}
 $url=[regex]::Match($blocks[0].Value,'url\(([^)]+)\)').Groups[1].Value
 $path="public/editor/fonts/$id.woff2"
 Invoke-WebRequest -Uri $url -OutFile $path
 $license='OFL-1.1'; $licenseSource="https://raw.githubusercontent.com/google/fonts/main/ofl/$folder/OFL.txt"
 try{Invoke-WebRequest -Uri $licenseSource -OutFile "public/editor/fonts/$id-OFL.txt"}catch{
  $licenseSource="https://raw.githubusercontent.com/google/fonts/main/apache/$folder/LICENSE.txt"
  Invoke-WebRequest -Uri $licenseSource -OutFile "public/editor/fonts/$id-OFL.txt"
  $license='Apache-2.0'
 }
 $inventory+=@{id=$id;family=$family;weight=400;style='normal';file="editor/fonts/$id.woff2";sha256=(Get-FileHash $path -Algorithm SHA256).Hash.ToLower();bytes=(Get-Item $path).Length;source=$source;download=$url;license=$license;licenseSource=$licenseSource;licenseFile="editor/fonts/$id-OFL.txt"}
 Write-Output "$id downloaded"
}
$inventory | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 assets/editor/font-inventory.json
