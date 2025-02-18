@echo off
set curl_found=""
set wget_found=""
FOR /F "usebackq" %%I IN (`where curl 2^>nul`) do set curl_found=%%I
FOR /F "usebackq" %%I IN (`where wget 2^>nul`) do set wget_found=%%I
set url=%1
if %curl_found% neq "" ( 
   curl -sL %url% stdout 2>nul
) else ( if %wget_found% neq "" ( 
  wget -O - %url% 2>nul
  )
)
  