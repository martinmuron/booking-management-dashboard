# Ubyport Comprehensive Reference
This Markdown document consolidates the contents of the following original files:

1. UbyPortPr5.pdf
2. UbyportProvozniRad.pdf
3. Ubyport_Appendix_A_EN.pdf
4. Ubyport_manual_2_0_v1.docx
5. ubyport.doc
6. ubyport_UNL_sample

Each of the sections below reproduces the extracted text from the respective source, preserving the original order and page structure as closely as possible. Form-feed markers were replaced with horizontal rules to indicate page breaks.

## Source: UbyPortPr5.pdf

---


# Page 1

Technický popis webové služby Ubyport 
 
Příloha č. 5 dokumentu Provozní řád Internetové aplikace Ubyport 
Aktualizace k 19. 6. 2019 
Počet příloh:  1  
OIPIT - Praha 2019 
 
PPo




---


# Page 2

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  2/17 
  
Obsah 
1. Účel dokumentu ................................ ................................ ................................ ........................... 3 
2. Účel služby ................................ ................................ ................................ ................................ ... 4 
2.1 Přístup................................ ................................ ................................ ................................ ... 4 
3. Seznam metod ................................ ................................ ................................ ............................. 5 
4. Popis tříd a výčtových proměnných ................................ ................................ ..............................  6 
4.1 Druh číselníku ................................ ................................ ................................ ....................... 6 
4.2 Datové typy - třídy ................................ ................................ ................................ ................. 6 
5. Příklady volání ................................ ................................ ................................ ..............................  8 
5.1 Volání metody ZapisUbytovane ................................ ................................ ............................. 8 
5.1.1 Návrat s věcnou chybou ................................ ................................ ................................ .... 8 
5.1.2 Návrat při havárii služby ................................ ................................ ................................ ..... 9 
5.1.3 Ukázka serializované třídy na vstupu ................................ ................................ ............... 10 
5.1.4 Ukázka serializované třídy výstupu ................................ ................................ .................. 10 
5.2 Volání TestDostupnosti ................................ ................................ ................................ ....... 11 
5.3 Volání DejMiCiselnik ................................ ................................ ................................ ........... 11 
5.3.1 Státní příslušnosti ................................ ................................ ................................ ............ 11 
5.3.2 Chyby ................................ ................................ ................................ ..............................  12 
5.3.3 Důvody pobytu ................................ ................................ ................................ ................. 13 
5.4 Volání MaxDelkaSeznamu ................................ ................................ ................................ .. 15 
6. WSDL ................................ ................................ ................................ ................................ ......... 16 
7. Shrnutí ................................ ................................ ................................ ................................ ....... 17




---


# Page 3

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  3/17 
1. Účel dokumentu 
Tento dokument poskytuje informace potřebné pro vytvoření klienta služby WS_UBY a neřeší technické 
specifikace spojení mezi klientem a serverem  (verze TSL SSL,  případně verze SOAP, způsob 
autentizace atd..). Pro porozumění textu je vhodná znalost jazyka C#, ale není nezbytně nutná. 
Příklady použití jednotlivých metod jso u vyrobeny aplikací WCFTestClient a nemusí být v jiném 
prostředí funkční.




---


# Page 4

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  4/17 
2. Účel služby 
Webová služba WS_UBY slouží k  automatizovanému odesílání hlášení z  informačního systému 
ubytovatele do informačního systému UBY. Služba je založena na protokolu SOAP. 
 
2.1 Přístup 
Přístup ke službě je autentizován prostřednictvím Windows NTLM.  
Uživatel má přidělené pevné jméno a heslo. Jméno musí souhlasit se zadávanou hodnotou uUzivatel. 
Data za ubytovací zařízení může posílat jen ten uživatel, kterému byl (pro dané ubytovací zařízení - dle 
uIdub) přidělen účet (jméno a heslo).   
Parametr AutenticationCod e není používán a je př ipraven na případnou změnu nebo rozšíření 
autentizace. V současné době se tato položka nepoužívá, ale formálně musí být vyplněna (nesmí být 
prázdná a může v ní být cokoliv, je doporučen znak „X„). 
 
Služby jsou vystaveny v CMS2 a jejich URL je: 
 
Testovací prostředí: 
https://ubyport.pcr.cz/ws_uby_test/ws_uby.svc 
 
Produkční prostředí 
https://ubyport.pcr.cz/ws_uby/ws_uby.svc 
 
Aktuální WSDL je možné získat voláním výše uvedené url rozšířené o parametr ?singleWsdl  
 
Poznámka: 
Vzhledem k tomu, že mohou probíhat změny komunikační infrastruktury, případné změny URL nejsou vyloučeny. Informace 
o změnách budou zveřejňovány na webových stránkách Ministerstva vnitra ČR, které je správcem síťové infrastruktury.




---


# Page 5

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  5/17 
3. Seznam metod 
 
Metoda popis 
bool TestDostupnosti(string 
AutentificationCode);  
 
Ověří dostupnost služby včetně backendu. 
 
int MaximalniDelkaSeznamu(string 
AutentificationCode); 
Vrátí maximální délku seznamu ubytovaných 
pro vkládání. Delší pole nebude vloženo a 
služba vrátí chybu 
List<CiselnikType> DejMiCiselnik( string 
AutentificationCode, 
                                                                                 
DruhCislelniku CoChci); 
Vypíše příslušný číselník daný výčtovým typem. 
Z důvodu různé struktury číselníků, jsou tyto 
struktury ve výpisu unifikovány. 
Chyby ZapisUbytovane(string 
AutentificationCode, 
          SeznamUbytovanych Seznam); 
Vloží seznam ubytovaných a vrátí záznam o 
zpracování a to jak formou seznamu chyb 
v datové třídě tak v PDF dokumentu. 
 
Parametr AutentificationCode je rezerva, která není zatím využita, ale musí být formálně vyplněna, je 
doporučen znak „X“.




---


# Page 6

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  6/17 
4. Popis tříd a výčtových proměnných 
 
4.1 Druh číselníku  
 
Výčtový typ DruhCislelniku určuje, který číselník bude vypsán. 
 
Typ Význam 
Staty Číselník státních příslušností 
UcelyPobytu Číselník účelů pobytů 
Chyby Chybovník 
 
 
4.2 Datové typy - třídy 
 
Datové typy – třídy jsou popsány  v tabulce. I když jsou proměnné typu string ve WSDL označeny 
nillable="true" neznamená to, že mohou být null vždy. Jedná se o vnitřní popis vytvořený generátorem 
WSDL, protože položka typu string může formálně nabývat hodnotu null. 
Pozor je rozdíl mezi položkou s hodnotou null a prázdnou položkou („“). 
 
  
   Třída CiselnikType 
 
 
Typ Jméno Význam 
Int (32 bit)  Id Číselný identifikátor 
String  Kod2 Dvouznakový kód *) 
String Kod3 Tříznakový kód *) 
String TextCZ Český název úplný *) 
String TextKratkyCZ Český název zkrácený *) 
String TextENG Anglický název úplný *) 
String TextKratkyENG Anglický název zkrácený *) 
String PlatiOd Datum od kdy kód platí **) 
String PlatiDo Datum do kdy kód platí **) 
 
        
*) platí jen pro číselníky států, u číselníku důvodů je použito jen kod2 a TextCZ 
u chybovníku je použit kod 2 pro kód chyby a v ostatních položkách je výklad a význam. 
 
**) může být i prázdné případně nevyplněné. 
 
 
 
Třída  SeznamUbytovanych obsahuje informace o ubytovateli a seznam ubytovaných. 
 
Typ Jméno Význam 
Boolean VracetPDF Příznak oznamující, že 
ubytovatel chce v odpovědi 
také PDF dokumenty *) 
String uIdub Identifikační číslo 
ubytovatele 
String uMark Zkratka ubytovatele 
String uName Název ubytovatele 
String uCont Kontakt na ubytovatele 
String uOkr Okres z adresy ubytovatele 
String uOb Obec z adresy ubytovatele




---


# Page 7

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  7/17 
String uObCa Část obce z adresy 
ubytovatele 
String UStr Ulice z adresy ubytovatele 
String uHomN Domovní číslo z adresy 
ubytovatele (číslo popisné, 
tj. to červené) max. 4 
číslice a E pro číslo 
evidenční 
String uOriN Orientační číslo z adresy 
ubytovatele (tj. to modré) 
max. 3 číslice a jedno 
písmeno 
String uPsc Poštovní směrovací číslo 
z adresy ubytovatele. 5 
číslic. 
Seznam  Ubytovani Seznam tříd Ubytovany 
 
 
 
          *) doplněno na základě změnového požadavku z prosince 2016 
           
       
Třída  Ubytovany  obsahuje osobní údaje o ubytovaném cizinci 
 
 
 
Typ Jméno  Význam 
DateTime cFrom Od kdy je ubytován, musí být 
vždy reálné datum.   
DateTime cUntil Do kdy je ubytován, musí být 
vždy reálné datum.  
String cSurN Příjmení - přípustné jen 
znaky abecedy, znak apostrof 
" ' " a spojník "-" 
 
String cFirstN Jméno - přípustné jen znaky 
abecedy, znak apostrof " ' " 
a spojník "-" 
String cDate Datum narození ve tvaru 
DDMMRRRR, přípustný tvar je i 
0000RRRR nebo 00DDRRRR 
String cPlac Místo narození, 48 znaků – 
Nevyužito. Položka se 
nepoužívá. 
String cNati Státní občanství podle 
číselníku. V číselníku staty 
je to položka Kod3. 
String cDocN Číslo cestovního dokladu, min 
4 max. 30 znaků, u dětí 
zapsaných v pasu rodičů se 
vyplní slovo „INPASS“ a číslo 
dokladu rodiče se zapíše do 
poznámky. Je-li INPASS pak 
nesmí být poznámka prázdná. 
String cVisN Číslo víza, max. 15 znaků 
nepovinné 
String cResi Bydliště v domovském státě, 
max. 128 znaků - Nepovinné




---


# Page 8

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  8/17 
Int? (32 bit nullable) cPurp Účel pobytu podle číselníku 
účelu cesty – nepovinné, 
není-li vyplněno, použije se 
defaultní hodnota 99 
String cSpz RZ vozidla, kterým cizinec 
přijel, max. 15 znaků - 
Nevyužito. Položka se 
nepoužívá. 
String cNote Poznámka k záznamu max. 255 
znaků alfanumerická položka –
neformalizováno.  
 
 
Třída Chyby obsahuje návratové údaje o tom, zda a jak se povedl zápis seznamu. Pozor některé 
chyby jsou vraceny jako FaultException viz příklad níže (5.1.3). 
 
 
Typ Název Význam 
String ChybyHlavicky Čísla chyb oddělené ; 
popisující chyby ve třídě 
SeznamUbytovanych  
String DokumentPotvrzeni PDF dokument ve tvaru 
basecode64 obsahující 
potvrzení o zpracování dat 
String DokumentChybyPotvrzeni PDF dokument ve tvaru 
basecode64 obsahující chyby 
ve zpracovaných datech 
String ChybyZaznamu Čísla chyb jednotlivých 
záznamů v seznamu Ubytovany 
oddělená ; (pokud má jedna 
položka více chyb) 
String PseudoRazitko Značka, která je obsažena 
v PDF dokumentu. 
 
 
 
 
5. Příklady volání 
 
5.1 Volání metody ZapisUbytovane  
5.1.1 Návrat s věcnou chybou  
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header> 
    <Action s:mustUnderstand="1" 
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/ZapisUbytovane</Action> 
  </s:Header> 
  <s:Body> 
    <ZapisUbytovane xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <Seznam xmlns:d4p1="http://schemas.datacontract.org/2004/07/WS_UBY" 
xmlns:i="http://www.w3.org/2001/XMLSchema-instance"> 
        <d4p1:Ubytovani> 
          <d4p1:Ubytovany> 
            <d4p1:cDate>01.01.1911</d4p1:cDate>




---


# Page 9

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  9/17 
            <d4p1:cDocN>aaa</d4p1:cDocN> 
            <d4p1:cFirstN>aaa</d4p1:cFirstN> 
            <d4p1:cFrom>2016-04-27T09:28:00</d4p1:cFrom> 
            <d4p1:cNati>AFG</d4p1:cNati> 
            <d4p1:cNote i:nil="true" /> 
            <d4p1:cPlac i:nil="true" /> 
            <d4p1:cPurp i:nil="true" /> 
            <d4p1:cResi i:nil="true" /> 
            <d4p1:cSpz i:nil="true" /> 
            <d4p1:cSurN i:nil="true" /> 
            <d4p1:cUntil>2016-04-27T09:28:00</d4p1:cUntil> 
            <d4p1:cVisN i:nil="true" /> 
          </d4p1:Ubytovany> 
        </d4p1:Ubytovani> 
        <d4p1:uCont>aaa</d4p1:uCont> 
        <d4p1:uHomN>aaa</d4p1:uHomN> 
        <d4p1:uIdub>100227887600</d4p1:uIdub> 
        <d4p1:uMark>CZGFW</d4p1:uMark> 
        <d4p1:uName i:nil="true" /> 
        <d4p1:uOb i:nil="true" /> 
        <d4p1:uObCa i:nil="true" /> 
        <d4p1:uOkr i:nil="true" /> 
        <d4p1:uOriN i:nil="true" /> 
        <d4p1:uPsc>14200</d4p1:uPsc> 
        <d4p1:uStr i:nil="true" /> 
      </Seznam> 
    </ZapisUbytovane> 
  </s:Body> 
</s:Envelope> 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <ZapisUbytovaneResponse xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <ZapisUbytovaneResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY" 
xmlns:i="http://www.w3.org/2001/XMLSchema-instance"> 
        <a:ChybyHlavicky>5;6;7;8;9;10;11;12;13;</a:ChybyHlavicky> 
        <a:ChybyZaznamu xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays"> 
          <b:string>;112;106;</b:string> 
        </a:ChybyZaznamu> 
      </ZapisUbytovaneResult> 
    </ZapisUbytovaneResponse> 
  </s:Body> 
</s:Envelope> 
 
 
5.1.2 Návrat při havárii služby  
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <s:Fault> 
      <faultcode>s:Chyba běhu programu</faultcode>




---


# Page 10

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  10/17 
      <faultstring xml:lang="cs-CZ">Server was unable to process request. ---&gt; Length cannot be 
less than zero. 
Parameter name: length</faultstring> 
    </s:Fault> 
  </s:Body> 
</s:Envelope> 
 
5.1.3 Ukázka serializované třídy na vstupu 
 
<?xml version="1.0"?> 
<SeznamUbytovanych xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> 
  <VracetPDF>false</VracetPDF> 
  <uIdub>125</uIdub> 
  <uMark>aaa</uMark> 
  <uName>U Dubu</uName> 
  <uCont>test@seznam.cz</uCont> 
  <uOkr>Praha</uOkr> 
  <uOb>Praha</uOb> 
  <uObCa>Nusle</uObCa> 
  <uStr>Lennonova</uStr> 
  <uHomN>123</uHomN> 
  <uOriN>152</uOriN> 
  <uPsc>1110</uPsc> 
  <Ubytovani> 
    <Ubytovany> 
      <cFrom>2019-06-25T11:09:00</cFrom> 
      <cUntil>2019-06-25T11:09:00</cUntil> 
      <cSurN>Abbas</cSurN> 
      <cFirstN>Hassan</cFirstN> 
      <cDate>00001950</cDate> 
      <cNati>UK</cNati> 
      <cDocN>aa123</cDocN> 
      <cVisN>123456</cVisN> 
      <cResi>Uzgorod</cResi> 
      <cPurp xsi:nil="true" /> 
    </Ubytovany> 
  </Ubytovani> 
</SeznamUbytovanych> 
 
 
5.1.4 Ukázka serializované třídy výstupu 
 
PDF v basecode64 je zkrácen. 
 
<?xml version="1.0"?> 
<Chyby xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> 
  <ChybyHlavicky>5;7;8;9;10;11;12;13;</ChybyHlavicky> 
  <DokumentPotvrzeni>JVBERi0xLjQKJdP0zOEKJSBQREZzaGFycCBWZXJzaW9uIDEuMzIuMj 
….. zde je několik kB textu a proto byl vynechán … 
emUgMTkKPj4Kc3RhcnR4cmVmCjU1MzE2CiUlRU9GCg==</DokumentPotvrzeni>




---


# Page 11

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  11/17 
  <ChybyZaznamu> 
    <string>;</string> 
  </ChybyZaznamu> 
  <PseudoRazirko>F8EA613D-C8C5-4671-924D-EE4F8588E08D</PseudoRazirko> 
</Chyby> 
 
 
5.2 Volání TestDostupnosti 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header> 
    <Action s:mustUnderstand="1" 
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/TestDostupnosti</Action> 
  </s:Header> 
  <s:Body> 
    <TestDostupnosti xmlns="http://UBY.pcr.cz/WS_UBY" /> 
  </s:Body> 
</s:Envelope> 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <TestDostupnostiResponse xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <TestDostupnostiResult>true</TestDostupnostiResult> 
    </TestDostupnostiResponse> 
  </s:Body> 
</s:Envelope> 
 
5.3 Volání DejMiCiselnik 
 
Výstupy z číselníků jsou zkráceny 
 
5.3.1 Státní příslušnosti 
 
 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header> 
    <Action s:mustUnderstand="1" 
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/DejMiCiselnik</Action> 
  </s:Header> 
  <s:Body> 
    <DejMiCiselnik xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <CoChci>Staty</CoChci> 
    </DejMiCiselnik> 
  </s:Body> 
</s:Envelope>




---


# Page 12

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  12/17 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <DejMiCiselnikResponse xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <DejMiCiselnikResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY" 
xmlns:i="http://www.w3.org/2001/XMLSchema-instance"> 
        <a:CiselnikType> 
          <a:Id>104</a:Id> 
          <a:Kod2>AF</a:Kod2> 
          <a:Kod3>AFG</a:Kod3> 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ>Afghánská islámská republika</a:TextCZ> 
          <a:TextENG>Afghanistan</a:TextENG> 
          <a:TextKratkyCZ>Afghánistán</a:TextKratkyCZ> 
          <a:TextKratkyENG /> 
        </a:CiselnikType> 
      …. 
        
     <a:CiselnikType> 
          <a:Id>241</a:Id> 
          <a:Kod2>ZW</a:Kod2> 
          <a:Kod3>ZWE</a:Kod3> 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ>Zimbabwská republika</a:TextCZ> 
          <a:TextENG>Zimbabwe</a:TextENG> 
          <a:TextKratkyCZ>Zimbabwe</a:TextKratkyCZ> 
          <a:TextKratkyENG /> 
        </a:CiselnikType> 
      </DejMiCiselnikResult> 
    </DejMiCiselnikResponse> 
  </s:Body> 
</s:Envelope> 
 
 
5.3.2 Chyby 
 
Vrácené texty nejsou ve stejném uspořádání jako číselník států. Text je rozdělen do více položek. Při 
zpracování je nutné vzít tuto anomálii na vědomí. 
Červeně označené číslo znam ená skutečné číslo chyby uvedené ve  třídě chyby v  položkách (bez 
vodících nul) ChybyHlavicky a ChybyZaznamu viz výše: 
 
        <a:ChybyHlavicky>5;6;7;8;9;10;11;12;13;</a:ChybyHlavicky> 
        <a:ChybyZaznamu xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays"> 
          <b:string>;112;106;</b:string> 
        </a:ChybyZaznamu> 
 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header>




---


# Page 13

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  13/17 
    <Action s:mustUnderstand="1" 
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/DejMiCiselnik</Action> 
  </s:Header> 
  <s:Body> 
    <DejMiCiselnik xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <CoChci>Chyby</CoChci> 
    </DejMiCiselnik> 
  </s:Body> 
</s:Envelope> 
 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <DejMiCiselnikResponse xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <DejMiCiselnikResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY" 
xmlns:i="http://www.w3.org/2001/XMLSchema-instance"> 
        <a:CiselnikType> 
          <a:Id>0</a:Id> 
          <a:Kod2>ERR_CZE_001</a:Kod2> 
          <a:Kod3>Nekorektní koncovka souboru</a:Kod3> 
 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ /> 
          <a:TextENG>INFORMACE</a:TextENG> 
          <a:TextKratkyCZ>0</a:TextKratkyCZ> 
          <a:TextKratkyENG>O podezření z chyby je nutno informovat uživatele, procedura pracuje 
dále</a:TextKratkyENG> 
        </a:CiselnikType> 
       …. 
        <a:CiselnikType> 
          <a:Id>0</a:Id> 
          <a:Kod2>ERR_CZE_112</a:Kod2> 
          <a:Kod3>Oznámeno pozdě</a:Kod3> 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ /> 
          <a:TextENG>INFORMACE</a:TextENG> 
          <a:TextKratkyCZ>0</a:TextKratkyCZ> 
          <a:TextKratkyENG>O podezření z chyby je nutno informovat uživatele, procedura pracuje 
dále</a:TextKratkyENG> 
        </a:CiselnikType> 
      </DejMiCiselnikResult> 
    </DejMiCiselnikResponse> 
  </s:Body> 
</s:Envelope> 
 
5.3.3 Důvody pobytu 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header>




---


# Page 14

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  14/17 
    <Action s:mustUnderstand="1" 
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/DejMiCiselnik</Action> 
  </s:Header> 
  <s:Body> 
    <DejMiCiselnik xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <CoChci>UcelyPobytu</CoChci> 
    </DejMiCiselnik> 
  </s:Body> 
</s:Envelope> 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <DejMiCiselnikResponse xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <DejMiCiselnikResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY" 
xmlns:i="http://www.w3.org/2001/XMLSchema-instance"> 
        <a:CiselnikType> 
          <a:Id>0</a:Id> 
          <a:Kod2>00</a:Kod2> 
          <a:Kod3 /> 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ>00 - ZDRAVOTNÍ</a:TextCZ> 
          <a:TextENG /> 
          <a:TextKratkyCZ /> 
          <a:TextKratkyENG /> 
        </a:CiselnikType> 
     ….. 
        <a:CiselnikType> 
          <a:Id>0</a:Id> 
          <a:Kod2>93</a:Kod2> 
          <a:Kod3 /> 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ>93 - TZV. ADS vízum udělované občanu Číny</a:TextCZ> 
          <a:TextENG /> 
          <a:TextKratkyCZ /> 
          <a:TextKratkyENG /> 
        </a:CiselnikType> 
        <a:CiselnikType> 
          <a:Id>0</a:Id> 
          <a:Kod2>99</a:Kod2> 
          <a:Kod3 /> 
          <a:PlatiDo /> 
          <a:PlatiOd /> 
          <a:TextCZ>99 - OSTATNÍ / JINÉ</a:TextCZ> 
          <a:TextENG /> 
          <a:TextKratkyCZ /> 
          <a:TextKratkyENG /> 
        </a:CiselnikType> 
      </DejMiCiselnikResult> 
    </DejMiCiselnikResponse> 
  </s:Body>




---


# Page 15

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  15/17 
</s:Envelope> 
 
5.4 Volání MaxDelkaSeznamu 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header> 
    <Action s:mustUnderstand="1" 
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/MaximalniDelkaSeznamu</Action> 
  </s:Header> 
  <s:Body> 
    <MaximalniDelkaSeznamu xmlns="http://UBY.pcr.cz/WS_UBY" /> 
  </s:Body> 
</s:Envelope> 
 
 
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"> 
  <s:Header /> 
  <s:Body> 
    <MaximalniDelkaSeznamuResponse xmlns="http://UBY.pcr.cz/WS_UBY"> 
      <MaximalniDelkaSeznamuResult>32</MaximalniDelkaSeznamuResult> 
    </MaximalniDelkaSeznamuResponse> 
  </s:Body> 
</s:Envelope> 
 
32 – znamená, že v seznamu může být maximálně 32 záznamů o ubytovaných.  
Tato hodnota je na straně serveru konfigurovatelná a může se v budoucnu měnit.




---


# Page 16

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  16/17 
6. WSDL 
 
WSDL služby je uvedeno v  příloze nebo je možné jej stáhnout  ze serveru, viz bod 2.1. V produkční 
instalaci je služba dostupná na protokolu HTTPS . URL uvedené ve WSDL bude jiné a je nutné  jej 
v aplikaci nakonfigurovat.




---


# Page 17

Odbor informatiky a provozu informačních technologií  |  Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport  17/17 
7. Shrnutí 
Tato služba je obálkou nad backendovou službou a umožňuje strojní zpracování na stejném 
backgroundu, jako probíhá zpracování ve webové aplikaci.  
 
Ze zkušeností z provozu doporučujeme: 
- Nepřekládat názvy nodů SOAP , pokud je SOAP tělo vytvářeno jiným způsobem , než použitím 
přístupových tříd. 
- Dodržovat datové typy, tak jak jsou definovány ve WSDL.  
 
 
 
Zpracoval: 
OIPIT PP ČR 
Jan Šich 
 
 
 
Schválil: 
OIPIT PP ČR 
pplk. Ing. David Konvalina

## Source: UbyportProvozniRad.pdf

---


# Page 1

Provozní řád Internetové aplikace Ubyport 
Aktualizace k 19.12.2018 
 
Ředitelství služby cizinecké policie - Praha 2018




---


# Page 2

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  2/27 
Obsah 
1 Úvodní ustanovení ................................ ................................ ................................ ....................... 5 
1.1 Účel dokumentu ................................ ................................ ................................ .................... 5 
1.2 Subjekty provozního řádu Internetové aplikace Ubyport ................................ ........................ 5 
2 Vymezení pojmů a zkratek ................................ ................................ ................................ ........... 6 
3 Odkazy ................................ ................................ ................................ ................................ ......... 8 
4 Zřízení přístupu do Ubyportu ................................ ................................ ................................ ........ 9 
4.1 Způsoby podání žádosti ................................ ................................ ................................ ........ 9 
4.2 Rozsah žádosti ................................ ................................ ................................ ...................... 9 
4.3 Formát žádosti ................................ ................................ ................................ ...................... 9 
4.4 Identifikační údaje registrovaného ubytovacího zařízení (IDUB, ZKRATKA) ......................... 9 
4.5 IDUB (identifikátor ubytovacího zařízení) ................................ ................................ ............ 10 
4.6 ZKRATKA ................................ ................................ ................................ ........................... 10 
5 Přihlašovací údaje ................................ ................................ ................................ ...................... 11 
5.1 Protokol o zřízení přihlašovacích údajů ................................ ................................ ............... 11 
5.2 Přihlašovací údaje do Ubyportu ................................ ................................ ........................... 11 
5.3 Ubytovatel, přihlašovací údaje hlavního uživatele ................................ ............................. 11 
5.4 Ubytovatel, přihlašovací údaje uživatele ................................ ................................ ............. 11 
5.5 Rozlišení hlavního uživatele a uživatele ................................ ................................ .............. 11 
5.6 Rozsah přihlašovacích údajů ................................ ................................ ...............................  12 
5.7 Přihlašovací jméno ................................ ................................ ................................ .............. 12 
5.8 Heslo ................................ ................................ ................................ ................................ ... 12 
5.9 Název uživatele ................................ ................................ ................................ ................... 12 
5.10 PUK ................................ ................................ ................................ ................................ .... 12 
5.11 Rozšířený uživatel ................................ ................................ ................................ ............... 12 
5.12 Přiřazení registrovaného ubytovacího zařízení rozšířenému uživateli ................................ . 12 
5.13 Sloučení již registrovaných ubytovacích zařízení k rozšířenému uživateli ........................... 13 
5.14 Přihlašovací údaje pro webovou službu Ubyport ................................ ................................ . 13 
5.15 Žádost o přihlašovací údaje pro webovou službu Ubyport ................................ ................... 13 
5.16 Rozlišení přihlašovacího jména ................................ ................................ ........................... 13 
6 Přihlášení do Ubyportu ................................ ................................ ................................ ............... 14 
6.1 První přihlášení do Ubyportu ................................ ................................ ...............................  14 
6.2 Přihlášení do Ubyportu ................................ ................................ ................................ ........ 14 
6.3 Přihlášení pro klienty webové služby Ubyport ................................ ................................ ..... 14 
6.4 Ztráta přihlašovacích údajů ................................ ................................ ................................ . 14 
6.5 Ztráta registračních údajů ................................ ................................ ................................ .... 14 
6.6 Forma hlášení ztráty přihlašovacích nebo registračních údajů ................................ ............ 14 
6.7 Hlášení ztráty hesla uživatele ................................ ................................ ..............................  14 
6.8 Zrušení registrace ubytovacího zařízení ................................ ................................ .............. 14




---


# Page 3

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  3/27 
6.9 Zrušení přihlašovacích údajů ................................ ................................ ...............................  14 
6.9.1 Forma žádosti ................................ ................................ ................................ .............. 15 
6.10 Blokace přihlašovacích údajů ................................ ................................ ..............................  15 
6.10.1 Blokace v administraci hlavního uživatele ................................ ................................ .... 15 
6.10.2 Blokace formou písemné žádosti ................................ ................................ ................. 15 
6.10.3 Blokace nesnese odkladu ................................ ................................ ............................ 15 
7 Vkládání dat do Ubyportu ................................ ................................ ................................ ........... 16 
7.1 Vstupní data o ubytovacím zařízení ................................ ................................ .................... 16 
7.2 Vstupní data cizince ................................ ................................ ................................ ............ 16 
7.3 Způsob vkládání dat ................................ ................................ ................................ ............ 16 
7.4 Doručenka ................................ ................................ ................................ ........................... 16 
7.5 Obsah doručenky ................................ ................................ ................................ ................ 16 
7.5.1 Rozsah seznamů v Doručence ................................ ................................ ..................... 17 
7.5.2 Formát doručenky ................................ ................................ ................................ ........ 17 
7.5.3 Obsah doručenky ................................ ................................ ................................ ......... 17 
8 Manuální vkládání dat prostřednictvím elektronického formuláře ................................ ................ 18 
8.1 Zápis dat ................................ ................................ ................................ ............................. 18 
8.2 Poznámka ................................ ................................ ................................ ........................... 18 
8.3 Vložení do seznamu ................................ ................................ ................................ ............ 18 
8.4 Editace položek uložených v seznamu ................................ ................................ ................ 18 
8.5 Editace řádku ................................ ................................ ................................ ...................... 18 
8.6 Výmaz dat ze seznamu ................................ ................................ ................................ ....... 18 
8.7 Odeslání dat do Ubyportu ke zpracování ................................ ................................ ............. 18 
9 Vkládání dat Importem souboru UNL................................ ................................ .......................... 19 
9.1 UNL soubor ................................ ................................ ................................ ......................... 19 
9.2 Název UNL souboru ................................ ................................ ................................ ............ 19 
9.3 Označení ubytovacího zařízení a výběr způsobu práce ................................ ...................... 19 
9.4 Zápis dat ................................ ................................ ................................ ............................. 19 
9.5 Odeslání dat do Ubyportu ke zpracování ................................ ................................ ............. 19 
10 Webová služba Ubyport ................................ ................................ ................................ .......... 20 
10.1 Technický popis webové služby ................................ ................................ .......................... 20 
10.2 Podmínky využití webové služby Ubyport v aplikacích třetích stran ................................ ..... 20 
10.3 Stupeň automatizace ................................ ................................ ................................ ........... 20 
10.4 Podmínky automatizace ................................ ................................ ................................ ...... 20 
10.5 Doporučené postupy pro vývojáře ................................ ................................ ....................... 20 
11 Testovací webová služba Ubyport pro vývojáře ................................ ................................ ...... 22 
11.1 Přístupová oprávnění do WsUbyportTest pro vývojáře ................................ ........................ 22 
11.2 Podmínky připojení do WsUbyportTest ................................ ................................ ............... 22 
11.3 Podmínky nasazení webové služby Ubyport v aplikacích ubytovatelů ................................ . 22




---


# Page 4

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  4/27 
11.4 Kontrola konzistence zaslaných testovacích dat ................................ ................................ .. 22 
12 Všeobecné podmínky ................................ ................................ ................................ ............. 23 
12.1 Ovládací prvky webového formuláře ................................ ................................ ................... 23 
12.2 Úvodní obrazovka Ubyportu ................................ ................................ ................................  23 
12.3 Doba nečinnosti práce s Ubyportem ................................ ................................ .................... 23 
12.4 Dodržování přiměřenosti ................................ ................................ ................................ ..... 23 
12.5 Prostředí pro práci s aplikací ................................ ................................ ...............................  23 
13 Uživatelská podpora ................................ ................................ ................................ ............... 24 
13.1 Uživatelská podpora provozovatele ................................ ................................ ..................... 24 
13.2 Uživatelská podpora správce ................................ ................................ ..............................  24 
13.3 Rozdělení uživatelské podpory správce podle směrů: ................................ ......................... 24 
13.4 Rozdělení uživatelské podpory správce podle úrovně ................................ ......................... 24 
13.4.1 Incident ................................ ................................ ................................ ........................ 24 
13.4.2 Dotaz ................................ ................................ ................................ ........................... 24 
13.4.3 Změnový požadavek ................................ ................................ ................................ .... 24 
13.5 Kontakt na pracovníky podpory ................................ ................................ ........................... 25 
14 Účinnost ................................ ................................ ................................ ................................ . 26 
15 Přílohy ................................ ................................ ................................ ................................ .... 27




---


# Page 5

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  5/27 
1 Úvodní ustanovení  
 
 
 
1.1 Účel dokumentu 
 
Provozní řád Internetové aplikace Ubyport (dále jen „Ubyport“) je souhrn pravidel, kterými se 
řídí Ředitelství služby cizinecké policie a spolupracující subjekty a které jsou závazné pro jeho 
provoz. 
Ubyport je zřízen a provozován jako prostředek pro oznamování ubytování cizinců 
ubytovatelem prostřednictvím dálkového přístupu sítí Internet1). 
 
  
1.2 Subjekty provozního řádu Internetové aplikace Ubyport 
 
 
a) Vkladatel 
 Autorizovaný uživatel Internetové aplikace Ubyport 
 
b) Správce 
 Ředitelství služby cizinecké policie Policie České republiky  
 
c) Provozovatel 
 Odbor informatiky a provozu informačních technologií Policejního prezidia České republiky  
 
d) Jiné subjekty 
 Externí vývojové firmy aplikací ubytovatelů  
 
e) Uživatelská podpora  
 Pracovníci Policie České republiky určení správcem nebo provozovatelem k  uživatelské 
podpoře vkladatelů, popřípadě jiných subjektů v daném rozsahu a působnosti 
 
 
 
 
 
 
 
 
 
                                                
1) § 102 odst. 2 písm. c) zákona č. 326/1999 Sb., o pobytu cizinců na území České republiky a o změně některých zákonů, ve 
znění pozdějších předpisů.




---


# Page 6

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  6/27 
2 Vymezení pojmů a zkratek 
 
 
Uživatelská aplikace ubytovatele (dále jen „UAU“) 
Programové vybavení ubytovatele určené pro evidenci ubytovaných osob v rámci provozu ubytovacího 
zařízení (hotelový informační systém).  
 
 
Ubytovatel 
Osoba s odpovědností ubytovatele oznamovat ubytování cizinců2). 
 
 
Povinnost ubytovatele oznamovat ubytování cizinců (povinnosti ubytovatele) 
Povinnosti ubytovatele3), zejména oznámit Policii České republiky ubytování cizince4).  
 
 
Osoba pověřená oznamovat ubytování cizinců (osoba pověřená) 
Osoba, na kterou ubytovatel přenesl povinnost oznamovat ubytování cizinců. 
 
 
Uživatel Ubyportu (dále jen „uživatel“) 
Ubytovatel nebo osoba jím pověřená s přístupem do Ubyportu. 
 
 
Hlavní uživatel Ubyportu (dále jen „hlavní uživatel“) 
Ubytovatel s přístupem do Ubyportu. 
 
 
Záznam cizince (dále jen „ZC“) 
Ucelená množina informací o ubytovaném cizinci. 
Rozsah: je stanoven5). 
Formát: je uveden v tomto dokumentu a je vázán na druh pořizování vstupních dat. 
 
 
Dávka hlášení 
Ucelená množina informací o ubytovateli, ubytovacím zařízení a záznamu cizince. 
V dávce hlášení je vždy jeden záznam o ubytovateli, ubytovacím zařízení a nejméně jeden záznam 
cizince. Maximální počet záznamů cizince a formát dat je určen v dokumentu o struktuře  UNL souboru 
v závislosti na druhu pořizování vstupních dat.  
 
 
RÚIAN (databáze RÚIAN) 
Registr územní identifikace adres a nemovitostí, který spravuje Český úřad zeměměřičský a 
katastrální. (http://ruian.cz/) 
 
  
                                                
2) § 99 odst. 1 zákona č. 326/1999 Sb.   
3) § 99 až 102 zákona č. 326/1999 Sb.   
4) § 100 písm. c) zákona č. 326/1999 Sb.   
5) § 97 zákona č. 326/1999 Sb.




---


# Page 7

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  7/27 
WS 
Webová služba na bázi protokolu SOAP v1.1. 
 
 
WSDL 
Popis rozhraní webové služby.  
 
 
Autentizace 
Ověření identity uživatele. 
 
 
Autorizace 
Přidělení přístupových práv uživateli po jeho úspěšné autentizaci. 
 
 
CAPTCHA (čti: kapča) 
Turingův test, který se na webu používá ve snaze automaticky odlišit skutečné uživatele od robotů. 
Test spočívá zpravidla v zobrazení obrázku s deformovaným textem, přičemž úkolem uživatele je 
zobrazený text opsat do příslušného vstupního textového pole. 
 
Identifikační číslo osoby (IČO) 
Číselný kód, který slouží k identifikaci osoby (ekonomického subjektu). 6) 
 
 
 
 
 
  
                                                
6) § 12 zákona č. 111/2009 Sb. , § 3019 zákona č. 89/2012 Sb.




---


# Page 8

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  8/27 
3 Odkazy 
 
Internetová aplikace Ubyport 
https://ubyport.policie.cz  
 
Informační web k problematice oznamování ubytovaných cizinců ubytovatelem 
http://www.policie.cz/ubytovani 
 
Registrace ubytovacího zařízení 
http://ubytovani.pcr.cz/reg 
 
Číselník druhu pobytu používaný v Internetové aplikaci Ubyport 
http://www.policie.cz/soubor/3-ucely-pobytu-pdf.aspx 
 
Číselník států - zdroj (Český statistický úřad) 
https://www.czso.cz/csu/czso/ciselnik_zemi_-czem- 
 
Webová služba Ubyport  
Stanovena v příloze č. 5  
 
Schéma webové služby Ubyport 
Stanovena v příloze č. 5




---


# Page 9

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  9/27 
4 Zřízení přístupu do Ubyportu 
 
Zřízení přístupu do Ubyportu je podmíněno registrací ubytovacího zařízení prostřednictvím webového 
formuláře, který vygeneruje „Žádost o registraci ubytovacího zařízení“.  Žádost o registraci ubytovacího 
zařízení, podá ubytovatel bezpečným a autorizovaným způsobem stanoveným v bodu 4.1. 
 
4.1 Způsoby podání žádosti 
 
Žádost lze podat jednou z následujících možností: 
1. Zasláním žádosti v elektronické podobě prostřednictvím datové schránky na adresu Ředitelství 
služby cizinecké policie ybndqw9 ,   
2. Zasláním žádosti v  elektronické podobě cestou internetové elektronické pošty (e -mailu) s 
elektronickým podpisem na adresu reguby@pcr.cz, 
3. Zasláním žádosti ve vytištěné listinné (papírové) podobě jako dopis na adresu Ředitelství služby 
cizinecké policie, Olšanská 2, Praha 3, 130 51, 
4. Osobním podáním žádosti ve  vytištěné listinné (papírové) podobě do podatelny Ředitelství 
služby cizinecké policie, Olšanská 2, 130 51  Praha 3, vchod A. 
 
Žádost zaslanou ve vytištěné listinné (papírové) podobě nebo podanou do podatelny musí ubytovatel 
vlastnoručně podepsat v pravé dolní části dokumentu pod textem a případně otisknout razítko. 
 
 
4.2 Rozsah žádosti 
1. Název ubytovacího zařízení (objektu, kde bude cizince ubytován), 
2. Identifikační číslo osoby ubytovatele; nemá-li ubytovatel identifikační číslo osoby , uvede rodné 
číslo; daňové identifikační číslo nelze uvádět, 
3. Kontaktní osoba, kterou se rozumí ubytovatel nebo osoba pověřená ubytovatelem 
oznamováním ubytování cizinců,  
4. Telefonní spojení, 
5. Adresa internetové elektronické pošty (e-mailu), 
6. Název datové schránky (ISDS), má-li ji ubytovatel zřízenu, 
7. Počet požadovaných přístupů do Ubyportu  
a. Každý ubytovatel získá povinně jeden přihlašovací přístup pro svoji osobu, 
b. Dostatečný počet přihlašovacích přístupů pro osoby pověřené (1 až 10 přístupů), 
8. Poznámka (upřesňující údaje k jednotlivým položkám), 
9. Adresa ubytovacího zařízení ztotožněná podle databáze RÚIAN,  
10. Číslo bytu, jedná-li se o ubytovací zařízení s více byty.  
 
 
4.3 Formát žádosti 
V rámci ulehčení práce a odstranění případných chyb při vyplňování žádosti o registraci ubytovacího 
zařízení, vytvořilo Ředitelství služby cizinecké policie průvodce žádostí ve formě webového formuláře 
zpřístupněného na Internetu, který žadateli pomůže bezchybně vyplnit stanovené položky a 
automaticky vygenerovat žádost o registraci ubytovacího zařízení ve formátu PDF. Uvedenou žádost 
po vyplnění ubytovatel zašle jedním ze způsobů stanoveným v bodě 4.1 na Ředitelství služby cizinecké 
policie. Vzor vyplněné žádosti o registraci ubytovacího zařízení  stanoví příloha č. 1. 
 
 
4.4 Identifikační údaje registrovaného ubytovacího zařízení (IDUB, ZKRATKA) 
Při registraci ubytovacího zařízení je ubytovateli přidělen Ředitelstvím služby cizinecké policie 
identifikátor ubytovacího zařízení (IDUB) a Zkratka. Oba identifikátory obdrží žadatel s  vysvětlením 
jejich použití v praxi.




---


# Page 10

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  10/27 
 
4.5 IDUB (identifikátor ubytovacího zařízení) 
Každému registrovanému ubytovacímu zaříze ní je přiděleno číslo IDUB. Jedná se o identifikátor 
ubytovacího zařízení vázaný na ubytovatele  a adresní místo .  IDUB se skládá z  12 až 14 čísel. Na 
příklad: „2016201258899“. 
 
4.6 ZKRATKA 
Každému registrovanému ubytovacímu zařízení je přidělena Zkratka. Zkrat ka slouží pro jednodušší 
identifikaci objektu při písemné nebo ústní komunikaci. Zkratka se skládá z  pěti znaků abecedy. Na 
příklad: „AAKLI“.




---


# Page 11

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  11/27 
5 Přihlašovací údaje 
 
5.1 Protokol o zřízení přihlašovacích údajů 
Je dokument v textové podobě ve formátu PDF vytvořený Ředitelstvím služby cizinecké policie, který 
v záhlaví obsahuje název uživatele, pro kterého byl vytvořen. Přihlašovací údaje jsou přihlašovací 
jméno a heslo. Identifikačním údajem je PUK, který slouží pro ověřování uživatele.  
 
 
5.2 Přihlašovací údaje do Ubyportu 
Na základě žádosti o registraci ubytovacího zařízení obdrží ubytovatel Protokol o zřízení 
přihlašovacích údajů: 
 
1. Hlavního uživatele s oprávněním: 
a. Vkládat data do Ubyportu, 
b. Změnit vlastní heslo, 
c. Zablokovat heslo podřízeného uživatele (uživatelů), 
d. Editovat oprávnění pro obsluhu ubytovacích zařízení podřízených uživatelů, 
2. Uživatele s oprávněním: 
a. Vkládat data do Ubyportu, 
b. Změnit vlastní heslo. 
 
 
5.3 Ubytovatel, přihlašovací údaje hlavního uživatele  
1. Obdrží vždy, 
2. Obdrží v počtu 1, 
3. Uloží na bezpečné místo, aby nemohlo dojít k jejich zneužití, 
4. Nepředává další osobě. 
 
 
5.4 Ubytovatel, přihlašovací údaje uživatele  
1. Obdrží podle počtu uvedeném v tiskopisu „Žádost o registraci ubytovacího zařízení“, 
2. Uloží na bezpečné místo, aby nemohlo dojít k jeho zneužití, 
3. Může předat osobě pověřené, 
4. Udržuje přehled o  
a. době předání přihlašovacích údajů osobě pověřené, 
b. údajích o osobě pověřené v takovém rozsahu, aby mohlo kdykoliv dojít k její 
identifikaci, 
c. incidentech způsobených osobou pověřenou, 
d. zablokování přihlašovacích údajů. 
    
5.5 Rozlišení hlavního uživatele a uživatele 
 
1. Název hlavního uživatele  
 maska  „XXXXX“, kde x = alfanumerický znak,   
 příklad „QWR4B“,  
2. Název uživatele  
 maska „XXXXX-YY“, kde x =  alfanumerický znak a y = numerický znak, 
 příklad „QWR4B-12“, „QWRVB-1“.




---


# Page 12

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  12/27 
5.6 Rozsah přihlašovacích údajů 
 
Přihlašovací údaje jsou: 
 
1. Přihlašovací jméno, 
2. Heslo, 
 
Identifikační údaje jsou: 
1. Název uživatele, 
2. PUK. 
 
 
5.7 Přihlašovací jméno 
Slouží jako identifikátor pro přihlášení do Ubyportu. Přihlašovací jméno generuje automaticky Ubyport.  
Formát: alfanumerické znaky.  
Rozsah: 9 znaků. 
 
5.8 Heslo 
Jedinečný znakový řetězec sloužící k autentizaci uživatele Ubyportu. Heslo je generováno Ubyportem. 
Uživateli je umožněna změna hesla kdykoliv. 
Formát: alfanumerické a speciální znaky. 
Rozsah: 8 a více znaků. 
Další pravidla: řetězec znaků musí obsahovat alespoň: 
1. Jeden znak velké abecedy ( A až Z bez interpunkce), 
2. Jeden znak malé abecedy ( a až z bez interpunkce), 
3. Jeden znak numerický (0 až 9). 
5.9 Název uživatele 
Slouží k identifikaci uživatele pro běžnou komunikaci. Na příklad při písemné nebo hlasové komunikaci. 
Název uživatele stanoví Ředitelství služby cizinecké policie. 
Formát: alfanumerické znaky. 
Rozsah: 5 až 10 znaků. 
 
5.10 PUK 
Jednoznačný řetězec znaků identifikující uživatele při komunikaci s  Ředitelstvím služby cizinecké 
policie. 
Formát: číslo. 
Rozsah: pětimístné. 
 
5.11 Rozšířený uživatel 
Rozšířený uživatel je vkladatel, který může pod jedním přihlašovacím jménem (loginem) vkládat údaje 
za více ubytovacích zařízení. Rozšířeného uživatele lze vytvořit jen pro vstup uživatele do Ubyportu 
pro vkládání dat  pomocí formuláře nebo export UNL souboru. 
 
5.12 Přiřazení registrovaného ubytovacího zařízení rozšířenému uživateli 
Ubytovatel v žádosti o registraci ubytovacího zařízení uvede v položce „Počet uživatelských kont“ 
číslici „0“ a do položky „Poznámka“ uvede přihlašovací jméno (přihlašovací jména) rozšířeného 
uživatele (rozšířených uživatelů).




---


# Page 13

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  13/27 
5.13 Sloučení již registrovaných ubytovacích zařízení k rozšířenému uživateli 
Ubytovatel, kterému již v minulosti byly předány přihlašovací údaje k registrovaným ubytovacím 
zařízením, požádá volnou formou o rozšířeného uživatele postupem stanoveným v bodě 4.1.  
V žádosti uvede IDUB, zkratku, název ubytovacího zařízení, adresu ubytovacího zařízení, kontaktní 
údaje a přihlašovací jméno rozšířeného uživatele.  
 
 
5.14 Přihlašovací údaje pro webovou službu Ubyport 
Pro využívání webové služby jsou  vyžadovány samostatné přihlašovací údaje. Webová služba ke 
své činnosti používá pouze přihlašovací jméno a heslo, které je ověřováno vůči doméně 
„EXRESORTMV“. Každé ubytovací zařízení vyžaduje své přihlašovací údaje.  
 
 
5.15 Žádost o přihlašovací údaje pro webovou službu Ubyport  
 
1. Při registraci ubytovacího zařízení ubytovatel postupuje stejným způsobem stanoveným 
v bodě 4 a do položky „Počet ubytovacích kont“ vybere jednu z možných voleb: 
a. Přihlašovací údaje jen pro WS  (možnost zasílání dat automatizovaně webovou 
službou) 
b. Přihlašovací údaje pro WS a uživatele (možnost zasílání dat automatizovaně 
webovou službou a současně manuálně prostřednictvím webových formulářů nebo 
vkládání UNL souborů), 
2. Žádost o přihlašovací údaje pro webovou službu již registrovaného ubytovacího zařízení se 
podává volnou formou postupem stanoveným v bodě 4.1.  V žádosti uvede IDUB, zkratku, 
název ubytovacího zařízení, adresu ubytovacího zařízení, kontaktní údaje a text žádosti - co je 
konkrétně žádáno.  
 
 
5.16 Rozlišení přihlašovacího jména 
 
Přihlašovací jména jsou rozlišena podle jejich účelu: 
1. Uživatelská přihlašovací jména pro vstup uživatele do Ubyportu pro vkládání dat  pomocí 
formuláře nebo export UNL souboru  
 maska:  „ubxxxxxxx“ kde x = numerický znak,  
 příklad:   ub1234567, 
2. Uživatelské přihlašovací jméno pro webovou službu Ubyportu  
 maska:  „uby-wsxxxxxx“ kde x = alfanumerický znak, 
 příklad:   uby-ws12cdef, 
3. Uživatelské přihlašovací jméno pro webovou službu Internetové aplikace UbyportTest pro 
vývojáře aplikací  
 maska: „uby-twsxxxxx“  kde x = alfanumerický znak, 
 příklad:  uby-tws1ab45.




---


# Page 14

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  14/27 
6 Přihlášení do Ubyportu  
Přihlášení se provádí na obrazovce „UBY - Přihlášení do systému“.  
 
6.1 První přihlášení do Ubyportu 
Po převzetí přihlašovacích údajů je uživatel povinen si změnit heslo. Změna hesla se provádí na 
obrazovce „Přihlášení do systému“ volbou „Změnit heslo“.  Na obrazovce „Změna hesla“ jsou čtyři 
textová pole. Do prvého textového pole zapíše uživatel přihlašovací jmén o. Do druhého současné 
heslo. (heslo předané Ředitelstvím služby cizinecké policie). Do dalších dvou textových polí zapíše 
nové heslo podle pravidel stanovených pro heslo. Po aktivaci tlačítka  „Změnit heslo“ aplikace 
zkontroluje platnost přihlašovacího jména a původního hesla. Po zdárném výsledku následně 
kontroluje, zda obě nová hesla jsou totožná a odpovídají stanoveným pravidlům. Po všech pozitivních 
kontrolách je heslo změněno.  
 
6.2 Přihlášení do Ubyportu 
Přihlášení se provádí na obrazovce „ UBY - Přihlášení do systému“ vyplněním textového pole 
„Přihlašovací jméno“ a „Heslo“. Následně je nezbytné opsat z CAPTCHA pětimístný bezpečnostní kód 
do příslušného textového pole. Po vyplnění všech tří položek je nutno aktivovat tlačítko „Přihlásit“.    
 
6.3 Přihlášení pro klienty webové služby Ubyport 
Popis přihlášení k webové službě stanoví příloha č. 5. 
 
6.4 Ztráta přihlašovacích údajů 
Ztráta přihlašovacích údajů se hlásí příslušné kontaktní osobě uvedené v bodě 13.5. 
 
 
6.5 Ztráta registračních údajů 
 Ztráta registračních údajů se hlásí příslušné kontaktní osobě uvedené v bodě 13.5. 
 
6.6 Forma hlášení ztráty přihlašovacích nebo registračních údajů 
Ztráta přihlašovacích nebo registračních údajů se hlásí písemně volnou for mou Ředitelství služby 
cizinecké policie postupem stanoveným v bodě 4.1 
 
 
6.7 Hlášení ztráty hesla uživatele 
Pokud uživatel zná svůj PUK, může oznámit ztrátu hesla telefonicky  nebo e-mailem kontaktní osobě 
uživatelské podpory uvedené v bodě 13.5. Identifikuje se Přihlašovacím jménem, IDUB a PUK. Nezná-
li svůj PUK, oznamuje ztrátu hesla hlavní uživatel způsobem stanoveným v bodě 6.4. Nové heslo bude 
zasláno elektronicky e-mailem na kontaktní adresu uvedenou v registraci ubytovacího zařízení. 
 
 
6.8 Zrušení registrace ubytovacího zařízení 
 
Ubytovatel požádá Ředitelství služby cizinecké policie o zrušení registrace ubytovacího zařízení v 
Ubyportu: 
1. Pokud ukončí provoz ubytovacího zařízení (příklady: změna IČO, RČ, adresy ), nebo 
2. Oznamuje-li ubytování cizinců jinak než Ub yportel tj. nemá povinnost oznamovat pouze 
Ubyportem, a rozhodne-li se, že oznamovat bude předkládáním přihlašovacích tiskopisů místně 
příslušnému odboru cizinecké policie krajského ředitelství Policie České republiky. 
 
6.9 Zrušení přihlašovacích údajů




---


# Page 15

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  15/27 
Ubytovatel požádá Ředitelství služby cizinecké policie o zrušení přihlašovacích údajů, pokud je již ke 
své činnosti nepotřebuje, tj. ukončí ubytovávání cizinců nebo ubytování již není předmětem jeho 
podnikatelské činnosti. 
 
6.9.1 Forma žádosti 
O zrušení registrace ubytovacího zařízení nebo o zrušení přihlašovacích údajů ubytovatel požádá na 
tiskopisu „Žádost o zrušení/změnu registrace ubytovacího zařízení“ (příloha č. 2), kterou zašle na 
Ředitelství služby cizinecké policie způsobem stanoveným v bodě 4.1. 
 
 
6.10 Blokace přihlašovacích údajů 
 
6.10.1 Blokace v administraci hlavního uživatele 
Pokud má ubytovatel podezření na zneužití přihlašovacích údajů podřízenými uživateli, nebo hlavním 
uživatelem, provede blokaci v Ubyportu za využití nástroje Administrace. Nabídka Administrace  je 
zobrazena jen při přihlášení hlavního uživatele. 
 
6.10.2 Blokace formou písemné žádosti 
Pokud hlavní uživatel nemůže provést blokaci v nástroji Administrace, postupuje obdobným způsobem 
jako v případě ztráty podle  bodu  6.6.  
 
6.10.3 Blokace nesnese odkladu 
Pokud blokace nesnese odkladu, oznámí tuto skutečnost telefonicky kontaktní osobě uvedené v bodu 
13.5 a následně postupuje podle bodu 6.10.2.




---


# Page 16

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  16/27 
7 Vkládání dat do Ubyportu 
 
Uživatel vkládá do Ubyportu data o ubytovacím zařízení a data ubytovaných cizinců. Tato ucelená 
množina informací se nazývá „Dávka hlášení“. V jedné Dávce hlášení je vždy informace o jediném 
ubytovacím zařízení, k němuž může být přiřazen jeden až maximální počet cizinců podle volby 
způsobu vkládání dat. Maximální počet je popsán u každé volby zvlášť.  
 
7.1 Vstupní data o ubytovacím zařízení 
Formát vstupních dat je uveden v příloze č. 3. 
Rozsah vstupních dat 
1. Formát 
2. IDUB 
3. Zkratka 
4. Název ubytovacího zařízení a číslo bytu, pokud se uvádí 
5. Kontakt  
6. Adresa ubytovacího zařízení 
a. Okres 
b. Obec 
c. Část obce 
d. Ulice 
e. Číslo domovní 
f. Číslo orientační 
g. PSČ (poštovní směrovací číslo) 
7. Datum a čas exportu 
 
Data o ubytovacím zařízení se v  každé dávce hlášení uvádí z  důvodu kontroly identifikačních údajů 
ubytovacího zařízení uváděných uživatelem a údajů vedených v databázi Ubyport. 
 
7.2 Vstupní data cizince 
Rozsah: vstupních dat je stanoven7). 
Formát: vstupních dat stanoví příloha č. 3. 
 
 
7.3 Způsob vkládání dat 
 
Ubyport umožňuje tři způsoby vkládání dat: 
1. Manuální vkládání dat z klávesnice prostřednictvím elektronického formuláře  
2. Vkládání dat importem UNL souboru 
3. Vkládání dat prostřednictvím webové služby 
 
 
7.4 Doručenka 
Po zdárném převzetí dat Ubyportem nabídne systém ke stažení textový dokument ve formátu PDF, 
který slouží jako potvrzení o převzetí dat Ubyportem, respektive splnění povinnosti oznámit ubytování 
cizinců ubytovatelem.  
 
7.5 Obsah doručenky 
Dokument „ Internetová aplikace Ubyport – doručenka elektronického oznámení ubytování cizinců 
ubytovatelem“  (dále jen „Doručenka“) obsahuje identifikaci ubytovatele, identifikaci ubytovacího 
zařízení, datum a čas převzetí dat, počet a seznam přijatých cizinců, počet a seznam cizinců nepřijatých 
                                                
7) § 97 zákona č. 326/1999 Sb.




---


# Page 17

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  17/27 
pro formální chyby v údajích o cizinci a identifikační kód. V případě vložení dat importem UNL souboru 
obsahuje Doručenka dále název importovaného souboru UNL a datum vytvoření souboru UNL 
vkladatelem. 
 
7.5.1 Rozsah seznamů v Doručence 
Seznam přijatých a nepřijatých cizinců v Doručence obsahuje veškeré údaje o cizinci zaslané 
ubytovatelem. 
 
7.5.2 Formát doručenky 
Vzor Doručenky stanoví příloha č. 4. 
 
7.5.3 Obsah doručenky 
1. Údaje o ubytovacím zařízení 
2. Údaje o uživateli 
3. Název importovaného souboru UNL 
4. Datum doručení oznámení 
5. Datum vytvoření souboru UNL 
6. Informace výsledku verifikace dat  
a. Celkový počet záznamů – UbyPort přečetl řádek jako záznam cizince 
b. Počet odmítnutých záznamů – UbyPort přečetl řádek jako záznam cizince, ale 
údaje jsou nekorektní (nepřijatý cizinec) 
c. Počet přijatých záznamů – UbyPort  přečetl řádek jako záznam cizince a všechny 
údaje jsou korektní 
d. Počet ignorovaných řádků – řádek je na místě, kde je předpokládán záznam 
cizince, ale nesplňuje kostru záznamu cizince 
7. Seznam nepřijatých záznamů (první a popřípadě další strana dokumentu) 
8. Seznam přijatých záznamů (první strana za poslední stranou seznamu nepřijatých 
záznamů) 
9. Kódové označení  transportu dat




---


# Page 18

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  18/27 
8 Manuální vkládání dat prostřednictvím elektronického formuláře 
Po zdárném přihlášení do Ubyportu se uživateli zobrazí webová stránka s názvem „Výběr ubytovacího 
zařízení a způsobu práce“.  Na této stránce je uživatel povinen označit ubytovací zařízení, ke kterému 
se vztahují data o ubytovaných cizincích.  
 
8.1 Zápis dat 
Samotné pořizování dat se uskutečňuje prostřednictvím formuláře webové stránky s  názvem 
„Elektronický přihlašovací tiskopis cizince“, který obsahuje elektronický formulář pro přímý zápis 
jednotlivých údajů k ubytovanému cizinci.  
Rubriky „Účel pobytu“, „Státní občanství“ se vyplňují výběrem v rozevíracím seznamu. Rubrika „Datum 
od“ a „Datum do“ umožňuje využít místní nabídku Kalendář. Ostatní údaje se zapisují do textových polí.  
 
8.2 Poznámka 
Ve formuláři „Elektronický přihlašovací tiskopis cizince“ je rubrika „Poznámka“ do které může vkladatel 
vyplnit upřesňující informace k jednotlivým položkám, například dítě rodiče (jméno a příjmení rodiče). 
 
8.3 Vložení do seznamu 
Po vyplnění povinných položek uživatel aktivuje tlačítko „ Přidat do seznamu“ a tímto údaje vloží do 
seznamu, který je součástí formuláře a zobrazuje se v  jeho dolní části. Maximální počet řádků 
v seznamu je stanoven na deset. Vložením dat do seznamu nedochází k  uložení dat na server ke 
zpracování, respektive k odeslání na Policii České republiky.  
 
8.4 Editace položek uložených v seznamu 
Jednotlivé řádky v seznamu lze editovat a mazat. 
 
8.5 Editace řádku 
Aktivací odkazu s názvem „Edit“ v příslušném řádku seznamu, dojde ke smazání řádku v seznamu a 
zobrazení Elektronického přihlašovacího tiskopisu cizince, který obsahuje údaje z editovaného řádku, 
které mají být opraveny. Po změně údajů k cizinci a aktivací tlačítka „Přidat do seznamu“ se opět 
zařadí opravené údaje do seznamu. 
 
8.6 Výmaz dat ze seznamu 
Aktivací odkazu s názvem „Del“ v příslušném řádku, dojde ke smazání řádku v seznamu bez 
možnosti návratu.  
 
8.7 Odeslání dat do Ubyportu ke zpracování 
Po kontrole dat uživatel odešle seznam ke zpracování na server Ubyport aktivací tlačítka „Odeslat 
seznam“. Ubyport nabídne ke stažení Doručenku „Stažení dokumentu Doručenka - doporučeno“. 
Doručenku si uživatel uloží na bezpečné místo k dalšímu možnému využití, doporučuje se do 
samostatné zabezpečené složky v počítači. S Doručenkou je nutné nakládat jako s dokumentem, 
který obsahuje osobní údaje.




---


# Page 19

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  19/27 
9 Vkládání dat Importem souboru UNL 
 
 
9.1 UNL soubor 
Popis, formát a rozsah souboru UNL stanoví příloha č. 3. 
 
9.2 Název UNL souboru 
 
Název UNL souboru tvoří: 
1. Povinné údaje 
a. IDUB, 
b. Datum (vytvoření ve formátu rok_měsíc_den), 
c. Čas (vytvoření ve formátu HodinaMinuta) 
d. Koncovka „.unl“, 
2. Nepovinné údaje 
a. Info - text pro případné bližší označení vkladatelem. 
 
Maska názvu souboru UNL: IDUB_datum_čas_info.unl . 
 
Příklad názvu souboru UNL: 10016201258899_2017_09_01_1221_recepce1_Haje.unl . 
 
Povolené znaky v názvu souboru: 
1. Alfanumerické znaky bez diakritiky, 
2. _ (podtržítko). 
 
Dodržení popisu, formátu, rozsahu UNL a názvu souboru je povinné. 
Rozsah UNL souboru – Počet řádků A = 1, počet řádků U = 1-99. 
 
 
9.3 Označení ubytovacího zařízení a výběr způsobu práce 
Po zdárném přihlášení do Ubyportu se uživateli zobrazí webová stránka s názvem „Výběr ubytovacího 
zařízení a způsobu práce“.  Na této stránce je uživatel povinen označit ubytovací zařízení, ke kterému 
se vztahují data o ubytovaných cizincích. Dále uživatel aktivuje tlačítko „Import dat (UNL soubor)“.  
 
 
9.4 Zápis dat 
Samotné pořizování dat se uskutečňuje prostřednictvím formuláře webové stránky s  názvem 
„Elektronický přihlašovací tiskopis cizince upload UNL souboru“, který obsahuje elektronický formulář 
s polem pro vyhledání souboru v  lokálním zařízen í a tlačítko „Načtení souboru“.  Aktivací tlačítka 
„Procházet …“ se otevře místní nabídka vyhledání souboru. Uživatel standardním způsobem vyhledá 
UNL soubor s aktuálními daty a potvrdí tuto volbu. V textové části se zobrazí cesta k UNL souboru. 
 
9.5 Odeslání dat do Ubyportu ke zpracování 
Aktivací tlačítka „Načtení souboru“ uživatel zašle data na server Ubyport ke zpracování, respektive 
k odeslání na Policii České republiky. Doba zpracování je přímo úměrná počtu zpracovávaných dat a 
může trvat i několik vteřin. Ubyport nabídne ke stažení Doručenku, která je potvrzením o převzetí dat 
Ubyportem. Doručenku si uživatel uloží na bezpečné místo k dalšímu možnému využití, doporučuje se 
do samostatné zabezpečené složky počítače . S Doručenkou je nutné nakládat jako s  dokumentem, 
který obsahuje osobní údaje.




---


# Page 20

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  20/27 
 
10 Webová služba Ubyport  
 
 
Webová služba Ubyport (UbyPortWS) je prostředek určený k přímé komunikaci mezi uživatelskou 
aplikací ubytovatele a serverem  Ubyport.   
 
10.1 Technický popis webové služby 
Technický popis webové služby Ubyport (UbyPortWS) stanoví příloha č. 5. 
 
10.2 Podmínky využití webové služby Ubyport v aplikacích třetích stran 
Informační systém na straně ubytovatele musí být řádně otestován a akceptován podle těchto kritérií 
a) Data vložená uživatelem jsou uložena v centru v řádném tvaru a nedošlo k jejich zkreslení, 
b) Systém předá uživateli potvrzení o přijetí dat nebo zprávu o chybě, 
c) Systém eskaluje nedostupnost služby nebo jiný technický výpadek centra, 
d) Systém eskaluje chybu v datech a nepřijetí dat v důsledku vstupních kontrol v centru, 
e) Systém se umí zotavit z výpadku centra během předávání dat a nedojde ke ztrátě dat. 
 
10.3 Stupeň automatizace 
1. Údaje o cizinci aplikace zašle automaticky ihned po uložení dat bez pokynu uživatele, 
2. Údaje o cizinci zašle aplikace automaticky v  časových intervalech bez pokynu uživatele (na 
příklad v hodinových nebo denních intervalech), 
3. Údaje o cizinci zašle aplikace na pokyn uživatele. 
 
10.4 Podmínky automatizace 
Programové vybavení uživatele, které využívá aut omatizaci procesu zasílání dat o oznamovaném 
ubytovaném cizinci za pomoci webové službu Ubyportu, musí: 
1. Uživatele vhodným způsobem informovat o překážce k přenosu dat, nebo jejich částí, 
2. Vhodným způsobem neprodleně informovat uživatele o nepřevzetí informa cí o oznamovaném 
ubytovaném cizinci (na příklad zasláním e-mailu nebo SMS zprávy osobě odpovědné, výraznou 
výstrahou v  grafickém prostředí aplikace na všech obrazovkách nebo obdobným účinným 
způsobem), 
3. Umožnit uživateli zobrazení Doručenky, 
4. Umožnit uživateli uložení Doručenky na jím vybrané místo, 
5. Umožnit uživateli editaci údajů o cizinci a opětovné zaslání údajů o cizinci do Ubyportu. 
 
 
10.5 Doporučené postupy pro vývojáře  
 
1. Konstrukce aplikace pro ubytovatele, která využívá automatizaci při zasílání údajů o cizinci na 
Policii České republiky prostřednictvím Internetové aplikace UbyPortWS , musí brát zřetel 
především na skutečnost, že za včas zaslaná data a jejich kvalitu odpo vídá ubytovatel. 
Uživatelská aplikace ubytovatele (UAU) musí ubytovateli umožňovat vždy vstoupit do procesu 
zasílání dat a ovlivnit jeho průběh. Jedná se především o stavy, kdy pro formální nedostatky 
nebyly údaje o cizinci převzaty Ubyportem, nedošlo ke s pojení mezi UAU a Ubyportem a 
podobně.  
2. Ubytovateli by mělo být vždy umožněno v případě pochyb opětovné zaslání dat směrem k Policii 
České republiky.  
3. Databáze s údaji ubytovaného cizince by měla vždy obsahovat informaci o výsledku oznámení 
na Policii Česk é republiky (oznámeno, neoznámeno) a časovém razítku, kdy k  oznámení 
úspěšně došlo. Každý seznam cizinců vygenerovaný UAU by měl obsahovat informaci o




---


# Page 21

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  21/27 
splněné povinnosti oznámit cizince na Policii České republiky. Na příklad vhodnou ikonkou, 
prefixem nebo obdobným způsobem, aby mohl ubytovatel nebo osoba jím pověřená reagovat 
na tento podnět. 
4. Využití stupně automatizace se doporučuje ponechat na volbě uživatele UAU. V  praxi to 
znamená, že UAU umožňuje všechny tři stupně automatizace a uživatel (administrátor UAU) si 
nastavením své aplikace sám zvolí vhodný stupeň automatizace. 
5. Při prvotním zápisu a uložení dat o ubytovaném cizinci do UAU provést kontrolu dat podle 
požadavků Ubyportu a v případě nekorektnosti informovat uživatele o překážce zaslání dat na 
Policii České republiky a vyzvat k jejímu odstranění.




---


# Page 22

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  22/27 
11 Testovací webová služba Ubyport pro vývojáře 
Pro vývojáře je zřízena testovací webová služba Ubyport (dále jen „WsUbyportTest“), kde lze 
otestovat automatizaci zasílání dat, přihlášení k webové službě a zpětnou odezvu. Technický popis 
webové služby je uvede v příloze č. 5 a je totožný s popisem webové služby v provozním prostředí. 
 
11.1 Přístupová oprávnění do WsUbyportTest pro vývojáře 
Přístupová oprávnění obdrží vývojáři po registraci, která je totožná s registrací ubytovacího 
zařízení "Žádost o registraci ubytovacího zařízení" s těmito rozdíly: 
1. Do rubriky „Adresy ubytovacího zařízení“ se uvede adresa sídla vývojové firmy. 
2. Do rubriky „Název ubytovacího zařízení“ se  uvede „TEST WS - a název vývojové firmy". 
3. Do ostatních rubrik se uvedou údaje vývojové firmy. 
4. Rubrika „Počet:“ se uvede vždy číslice 1. 
5. Do rubriky „Poznámka:“se uvede text: „TEST WS - a název firmy“. Do této rubriky lze dále 
uvést i další upřesňující informace podle potřeby. 
 
Vygenerovanou „Žádost o registraci ubytovacího zařízení“  zašle vývojář elektronickou poštou (e-
mailem) na adresu: rscp.spis@pcr.cz. Do e-mailové položky „Předmět“ se uvede text: „TEST WS 
registrace“.  Přihlašovací údaje Ředitelství služby cizinecké policie zašle vývojář na adresu 
elektronické pošty (e-mailu) uvedenou v „Žádosti o registraci ubytovacího zařízení“. 
 
11.2 Podmínky připojení do WsUbyportTest  
Registrovaná vývojová firma se vstupem do Ws UbyportTest (dále jen „uživatel WsUbyportTest“) je 
povinna: 
1. přihlašovací údaje do WsUbyportTest použít jen pro svoji potřebu, 
2. pracovat se smyšlenými daty (s ohledem na ochranu osobních údajů), 
3. nepřesáhnout stanovenou denní dávku zaslaných dat 1000 oznámených osob, 
4. vyvarovat se jakékoliv nekorektní činnosti, která by vedla k výpadku WsUbyportTest, nebo 
poškození jeho součástí. 
Zjistí-li správce nebo provozovatel porušení těchto zásad, zablokuje správce přihlašovací údaje 
uživatele WsUbyportTest. 
 
11.3 Podmínky nasazení webové služby Ubyport v aplikacích ubytovatelů 
Podmínky využití webové služby Ubyport v aplikacích ubytovatelů jsou stanoveny v bodě 10.2.   
 
11.4 Kontrola konzistence zaslaných testovacích dat 
Postup při ověření podmínky „Data vložená uživatelem jsou uložena v centru v řádném tvaru a 
nedošlo k jejich zkreslení“: (bod 10.2 písm. a)) 
1. Vývojová firma vytvoří seznam 100 až 500 smyšlených osob.  
2. Podle seznamu zašle webovou službou data do WsUbyportTest. 
3. Seznam dat zašle (csv, xls, unl) e-mailem na adresu rscp.spis@pcr.cz 
4. Správce Ubyportu data zkontroluje a informuje vývojovou firmu o konzistenci zaslaných 
kontrolních dat v e-mailové zprávě.




---


# Page 23

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  23/27 
12 Všeobecné podmínky 
 
12.1 Ovládací prvky webového formuláře 
Uživatel Ubyportu je povinen používat výhradně ovládací prvky Ubyportu. Při použití ovládacích prvků 
webového prohlížeče nebo systému může dojít k nekorektnímu procesu, odhlášení uživatele nebo 
k incidentu komunikace klienta se serverem.  
 
12.2 Úvodní obrazovka Ubyportu 
K vstupu do Ubyportu je určena výhradně Úvodní obrazovka, jejíž adresa je uvedena v bodě  3.  
Nedodržení této zásady může mít za následek nekorektní přihlášení, odhlášení během práce 
s aplikací nebo ukončení komunikace klienta a serveru. 
 
12.3 Doba nečinnosti práce s Ubyportem 
Při nečinnosti práce s Ubyportem delší než 15 minut je z bezpečnostních důvodů automaticky 
provedeno odhlášení uživatele. 
Údaje rozepsané ve formuláři jsou při odhlášení ztraceny. Údaje uložené do seznamu před vložením 
na server, jsou uchovány a plně k dispozici při dalším přihlášení. 
 
12.4 Dodržování přiměřenosti 
Uživatel Ubyportu je povinen se chovat takovým způsobem, aby svým jednáním neohrožoval 
bezpečnost a funkčnost systému zejména: 
1. Bezdůvodným používáním aplikace, 
2. Opětovným zasíláním totožných dat, 
3. Zasíláním nepravdivých či smyšlených dat, 
4. Zasíláním dat v nekorektním formátu, 
5. Zasíláním neúplných dat. 
 
12.5 Prostředí pro práci s aplikací  
 
1. Komunikace s aplikací je možná pouze pomocí protokolu HTTPS, 
2. Internetová aplikace Ubyport je optimalizována pro prostředí prohlížečů uvedených na úvodní 
stránce Ubyportu https://ubyport.policie.cz.




---


# Page 24

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  24/27 
13 Uživatelská podpora 
 
Uživatelům Ubyportu je poskytnuta uživatelská podpora na úrovni provozovatele a správce. 
 
13.1 Uživatelská podpora provozovatele 
 
Provozovatel poskytuje uživatelskou podporu na úrovni funkčnosti Ubyportu a to především v případě 
výpadku systému, nekorektního chování systému nebo při zjištění kybernetického incidentu.  
 
13.2 Uživatelská podpora správce 
 
13.3 Rozdělení uživatelské podpory správce podle směrů: 
 
1. Podpora pro legislativní otázky 
a. Dotaz k výkladu zákona č. 326/1999 Sb., směřujících na elektronické oznamování 
ubytovaných cizinců ubytovatelem, 
b. Dotaz k výkladu provozního řádu Ubyportu, 
2. Podpora uživatelských účtů a registrace ubytovacího zařízení 
a. Otázky k Přihlašovacím údajům (zavedení, zapomenutá hesla, blokace), 
b. Otázky k registraci ubytovacího zařízení, 
c. Otázky ke změně ubytovatele, 
d. Otázky ke změně adresy, 
3. Technická podpora 
a. Uživatelské prostředí, 
b. Formát UNL souboru, 
c. Webová služba, 
d. Miniaplikace UbyData.xls. 
 
 
13.4 Rozdělení uživatelské podpory správce podle úrovně  
 
1. Incident, 
2. Dotaz, 
3. Změnový požadavek. 
 
 
13.4.1 Incident  
Incidentem se rozumí nečekaná událost, během které je Ubyport nebo některá jeho část nefunkční 
nebo nedostupná. Reakce na oznámení incidentu má nejvyšší prioritu a oznámení lze učinit kdykoliv 
v pracovní i mimopracovní době.  
 
13.4.2 Dotaz  
Dotazem se rozumí požadavek, který je žádostí o poskytnutí informací, rady nebo pomoci, jak řešit 
konkrétní problém. O prioritě reakce na dotaz rozhoduje pracovník podpory a to především vzhledem 
k závažnosti případného následku. V  případě existence informace, kter á řeší požadovaný dotaz, 
odkáže pracovník podpory uživatele na adresu existující informace na Internetu. 
 
13.4.3 Změnový požadavek 
Změnovým požadavkem se rozumí požadavky na vytvoření nebo změnu uživatelských údajů, hesla, 
registračních údajů, popřípadě funkcionality a kvalitu Ubyportu.  Reakce na oznámení změnového 
požadavku je realizována podle pořadí přijatého požadavku v pracovní době.




---


# Page 25

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  25/27 
 
13.5 Kontakt na pracovníky podpory 
 
Kontakt na pracovníky podpory Ubyportu je uveřejněn na www stránkách: 
http://www.policie.cz/clanek/kontaktni-osoby.aspx




---


# Page 26

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  26/27 
14 Účinnost 
 
Tento provozní řád nabývá účinnosti dnem 19. února 2018 
 
Č.j. CPR-5423-1/ČJ-2018-930003 
 
 
 
 
 
Ředitel 
Ředitelství služby cizinecké policie 
Policie České republiky 
plk. Mgr. Milan MAJER




---


# Page 27

Ředitelství služby cizinecké policie  |  Provozní řád Internetové aplikace Ubyport  27/27 
15 Přílohy 
 
Příloha č. 1 – Vzor dokumentu: Žádost o registraci ubytovacího zařízení 
  Název souboru:  UbyPortPr1.pdf 
 
 
Příloha č. 2 – Vzor dokumentu:  Žádost o zrušení/změnu registrace ubytovacího zařízení 
   Název souboru:  UbyPortPr2.pdf 
 
 
Příloha č. 3 – Popis položek o ubytovacím zařízení a o cizinci, formát UNL souboru 
  Název souboru:   UbyPortPr3.pdf 
 
 
Příloha č. 4 – Vzor dokumentu: Doručenka  
  Název souboru:   UbyPortPr4.pdf 
 
 
Příloha č. 5 – Technický popis webové služby Ubyport (UbyPortWS) 
  Název souboru:  UbyPortPr5.pdf

## Source: Ubyport_Appendix_A_EN.pdf

---


# Page 1

Příloha č. 3 k P Ř SCP č.   /2010               Strana  10 
 
Appendix A AIR CARRIER MANUAL 
 
 
 
 
 
 
 
 
 
 
 
DIRECTORATE OF ALIEN POLICE SERVICE  
 
TECHNICAL SPECIFICATIONS 
 
 
 
 
 
 
Date Edition:  29/05/2012 
Version:  1.03 
Document:  technical specifications




---


# Page 2

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 11 
 
Appendix A AIR CARRIER MANUAL 
 
 
INDEX  
 
 
1. Introduction 12 
2. Methods of sending files 13 
2.1. Teletype network 13 
2.2. Electronic Mail Error! Bookmark not defined. 
3. Formats of the Files 14 
Annex I. EDIFACT Format 15 
Annex II. Semicolon separated text file format Error! Bookmark not defined. 
Annex III. Example of an UN/EDIFACT file Error! Bookmark not defined. 
Annex IV. Example of a semicolon separated file Error! Bookmark not defined.




---


# Page 3

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 12 
 
Appendix A AIR CARRIER MANUAL 
 
1. Introduction  
 
According to the Czech law an airline carrier is obliged to provide passenger 
data to the Directorate of Alien Police Service. 
Whenever Directorate of Alien Police Service determine, with respect to the 
routes coming from outside the Schengen Area, that the intensity of the migratory 
flows makes it necessary, in order to fight illegal immigration and to guarantee 
public security, every company, transportation enterprise or freight carrier will be 
obliged, at the end time of the shipment and before the departure of the means of 
transport, to send to the Czech authorities in charge of the entrance control 
information related to the passengers transported, irrespective of whether the 
Czech Republic is a transit territory or a final destination of the transportation.  
The information will include the name and surname of each passenger, 
his or her date of birth, nationality, type and number of passport or the travel 
document that proves his/her identity.  
The Police of the Czech Republic have developed a system that enables the 
transportation companies to provide, through telematic resources, the information 
necessary to enforce the law. Each company have to provide the information about 
each flight in  a separate file, with a pre -established format in accordance with the 
UN/EDIFACT format.  
The following manual explains the means of providing information about the 
passengers on each flight.




---


# Page 4

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 13 
 
Appendix A AIR CARRIER MANUAL 
 
2. Methods of sending files 
 
The two methods detailed below are the ones by which information can be 
sent to the  Directorate of Alien Police Service . Each company may choose the 
method that is better suited to its needs.  
 
2.1. Teletype network 
 
The one and only way of  sending the files  is through the airline industry 
telecommunication networks provided by the organizations SITA or ARINC  (IATA 
Airline carrier network).  
 
The sender must: 
 
a) Have an access to TYPE B mailbox 
b) Respect the specification (format, message size limitation) of TYPE  B network 
provider 
 
The communication address.is : 
 
PRGCZ2X 
 
 
 
Note: This delivery method is only for UN/EDIFACT message formats (see bellow) 
based on IATA PAXLST specification.




---


# Page 5

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 14 
 
Appendix A AIR CARRIER MANUAL 
 
3. Formats of the Files 
 
There are a few supported formats: 
 
a) The UN/EDIFACT respecting the Annex I specification for delivery over airline 
teletype network or e-mail.




---


# Page 6

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 15 
 
Appendix A AIR CARRIER MANUAL 
 
 
Annex I. UN/EDIFACT Format 
 
FORMAT OF UN/EDIFACT DOCUMENT 
 
Each of the items (segments) of the document UN/EDIFACT is on one line. 
The line separator in UN/EDIFACT is the character “’” a t the end of each line, as 
can be seen in the example. Therefore, the line separator is mandatory to pass the 
UN/EDIFACT validation. 
 
To pass the UN/EDIFACT validation, the sent or uploaded files must have 
the format specified below, and must be files with the .txt extension. 
 
The boldfaced data is fixed, i.e. it must be always written in the same way.  
The italicized data contains information related to the flight, passenger or 
company, and changes from one case to another. 
 
 
UNA:+.? ' 
UNB+UNOA:4+SenderName:CarrierCode+CZAPIS:CarrierCode+PrepareDate:Pr
epareHour+InterchangeReference++APIS' 
UNG+PAXLST+SenderName:CarrierCode+CZAPIS:CarrierCode+PrepareDate:Pr
epareHour +1+UN+D:02B' 
UNH+Reference+PAXLST:D:02B:UN:IATA+IATACode+01:C' 
BGM+745' 
NAD+MS+++PartyName' 
COM+Phone:TE+Fax:FX' 
TDT+20+Flight' 
LOC+125+DepartureAirport' 
DTM+189:DepartureDate:201' 
LOC+87+ArrivalAirport' 
DTM+232:ArrivalDate:201' 
NAD+FL+++PassengerData' 
ATT+2++PassengerSex' 
DTM+329:BirthDate' 
LOC+178+DeparturePassenger' 
LOC+179+ArrivalPassenger' 
NAT+2+PassengerCountry' 
RFF+AVF:PassengerNumber' 
DOC+PassengerType:110:111+IdNumber' 
DTM+36:ExpirateDate' 
LOC+91+DocCountry'




---


# Page 7

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 16 
 
Appendix A AIR CARRIER MANUAL 
 
NAD+FL+++PassengerData' 
. 
. 
. 
LOC+91+DocCountry' 
CNT+42:NumberOfPassengers' 
UNT+NumberOfSegments+Reference' 
UNE+1+1' 
UNZ+1+InterchangeReference' 
 
Description of the items to be filled in.  
 
Element Description 
SenderName Name of the company responsible for 
sending the information. 
CarrierCode Carrier Code of the company. 
PrepareDate Date of preparation of the interchange 
file, in format YYMMDD 
YY = Year 
MM = Month 
DD = Day 
PrepareHour Hour of preparation of the interchange 
file, in format HHMM 
HH = Hour  
MM = Minute 
InterchangeReference Unique reference assigned by the  
company responsible to send the 
information for an interchange.  
This value must be the same in UNZ 
and UNB. 
Referente Unique reference of the message 
assigned by the sender. This value 
must be the same in UNH and UNT. 
IATACode IATA flight code. 
Example: OK0012/070915/1210 
CarrierCode = OK 
Flight Number = 0012 
Destination date = 15/09/2007 
Destination time = 12:10:00 
PartyName Full name of the company responsible 
for providing the information.




---


# Page 8

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 17 
 
Appendix A AIR CARRIER MANUAL 
 
Phone Telephone number of the company 
responsible for providing the 
information. 
Fax Fax number of the company 
responsible for providing the 
information.  
Flight Carrier Code/Flight Number. 
For example: OK051 
DepartureAirport Flight departure Airport. Three-
character IATA Code. 
DepartureDate Departure Flight date and time. The 
format is YYMMDDhhmm. 
YY = Year 
MM = Month 
DD = Day 
hh = Hour 
mm = Minute 
ArrivalAirport Flight arrival Airport. Three-character 
IATA Code. 
ArrivalDate Arrival Flight date and time. The 
format is YYMMDDhhmm. 
YY = Year 
MM = Month 
DD = Day 
hh = Hour 
mm = Minute  
PassengerData Contains the passenger’s personal 
data. As a minimum, the name and 
surname should appear. This data can 
include all of the passenger’s personal 
data, or omit some. A description of 
the data is given below, following table 
1. 
PassengerSex Passenger’s gender. One character. 
Validity includes: 
M = Male 
F = Female 
BirthDate Passenger’s date of birth, in format 
YYMMDD 
YY = Year 
MM = Month




---


# Page 9

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 18 
 
Appendix A AIR CARRIER MANUAL 
 
DD = Day 
DeparturePassenger Passenger’s departure airport. Three-
character IATA code. 
ArrivalPassenger Passenger’s arrival airport. Three-
character IATA code. 
PassengerCountry Passenger Nationality. Three-
character country code for 
passenger’s country, as per ISO 3166. 
PassengerNumber Flight passenger reservation number. 
35 characters at maximum.  
PassengerType Passenger document type. The 
passenger document type can have 
the Type Code field value of Table 1, 
which is shown following this table. 
IdNumber Unique number assigned to the 
identification document produced by 
the passenger. 
ExpirateDate Expiry date of the identification 
document produced by the passenger, 
in format YYMMDD 
YY = Year 
MM = Month 
DD = Day 
DocCountry Country code where the produced 
document was issued, as per ISO 
3166. 
NumberOfPassengers Total number of passengers whose 
data is included in the document. 
NumberOfSegments Number of message segments. A 
message segment is understood to be 
each of the rows comprised between 
the rows UNH  and  UNT, both 
include, (without including UNA, UNB, 
UNG, UNE and UNZ rows).




---


# Page 10

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 19 
 
Appendix A AIR CARRIER MANUAL 
 
Table 1: APIS Travel Document Code 
 
P Passport  
V Visa  
A Identity Card (exact use defined by the Issuing State) 
C Identity Card (exact use defined by the Issuing State) 
I Identity Card (exact use defined by the Issuing State) 
AC Crew Member Certificate  
IP Passport Card’  
T Refugee Travel Document  
F Approved non-standard 
identity documents used for 
travel 
(exact use defined by the Issuing State) 
 
 
 
PassengerData  Detail 
 
As previously stated, PassengerData has personal information related to the 
passenger:  
 
Surname:First Name:Second Name+Street and Number+City+State 
Code+Zip Code+ Country Code 
 
The Country code has three characters, as per ISO 3166. 
This data should at least include the passenger’s first name and surname.




---


# Page 11

Příloha č. 3 k P Ř SCP č.   /2010                                                                Strana 20 
 
Appendix A AIR CARRIER MANUAL

## Source: Ubyport_manual_2_0_v1.docx

Ubyport 2.0
Ubyport 2.0




Ubyport 2.0

Uživatelský manuál







Zpracoval
Tým Ubyport 2.0
Útvar
Policie České republiky (NCIKT, ŘSCP)
Datum vytvoření
02.10.2024
Datum aktualizace
31.10.2024
Počet stran
35
Počet příloh

Verze:
1.0



---


Obsah
1	Obecně o aplikaci Ubyport 2.0	4
2	Popis aplikace	4
2.1	Podporované verze internetových prohlížečů:	4
2.2	Podmínky užívání Ubyport	4
2.3	Podpora uživatelů	4
3	REGISTRACE	5
3.1	Obecný postup žadatele o registraci ubytovacího zařízení probíhá ve třech krocích:	5
3.1.1	Vyplnění formuláře registrace	5
3.1.2	Vygenerování žádosti o registraci do souboru PDF	5
3.1.3	Zaslání PDF souboru vygenerované žádosti na ŘSCP	5
4	Podrobný popis registrace nového ubytovacího zařízení	6
4.1	Obecné informace k ubytovacímu zařízení	8
4.1.1	Název ubytovacího zařízení (2)	9
4.1.2	Adresa ubytovacího zařízení (3)	9
4.1.3	Číslo bytu (4)	10
4.2	Kontaktní informace ubytovatele (1)	10
4.2.1	IČO ubytovatele (2)	11
4.2.2	Kontaktní osoba (3)	11
4.2.3	Jméno a příjmení osoby, která žádost podává (4)	11
4.2.4	Telefonní kontakt (5)	11
4.2.5	E-mail (6)	12
4.2.6	ISDS (datová schrána) (7)	12
4.3	Ostatní informace	12
4.3.1	Počet požadovaných údajů	12
4.3.2	Používaná aplikace – název aplikace (3)	13
4.3.3	Používaná aplikace – tvůrce programu (4)	13
4.3.4	Poznámka (5)	13
4.4	Generování dokumentu Žádosti o registraci ubytovacího zařízení ve formátu PDF	14
5	Přihlášení do aplikace Ubyport	15
6	Hlavní stránka aplikace	16
6.1	Hlavní menu	16
6.2	Seznam ubytovacích zařízení	17
6.3	Vyhledávání v seznamu	18
6.4	Výběr položky ze seznamu	18
7	Manuální vkládání dat prostřednictvím elektronického formuláře  ( nadále modul Formulář)	19
7.1	Pravidla pro vyplňování jednotlivých položek	19
7.2	Obecný postup zadávání dat v modulu Formulář	19
7.2.1	Vyplnění formuláře daty o ubytovaném cizinci	19
7.2.2	Vložení dat z formuláře do seznamu (1)	22
7.2.3	Životnost seznamu:	23
7.2.4	Odeslání seznamu ke zpracování (2)	23
7.2.5	Vygenerování a stažení doručenky	23
8	Vkládání dat Importem souboru UNL (dále modul Import UNL)	24
8.1	Načtení souboru	25
8.2	UNL soubor - příklad:	26
8.3	Odeslání souboru	26
8.4	Doručenka - příklad:	27
8.5	Seznam nekorektních údajů	28
8.6	Oprava chyb	28
8.7	Odeslání seznamu	29
9	Statistiky	32
10	Odhlášení z aplikace Ubyport	33
10.1	Odhlášení pomocí tlačítka „Odhlásit se“	33
10.2	Automatické odhlášení	34



---


Obecně o aplikaci Ubyport 2.0
Internetová aplikace Ubyport 2.0 (dále jen „Ubyport“) je nástroj pro oznamování digitální cestou ubytovaných cizinců ubytovateli, jejichž povinnosti stanoví § 99 až 102 zákona č. 326/1999 Sb., o pobytu cizinců na území České republiky a o změně některých zákonů, ve znění pozdějších předpisů.
Na základě historických zkušeností, postupného vývoje a požadavků ze strany uživatelů umožňuje  Ubyport tři možnosti zasílání dat:
	•	Manuální vkládání dat prostřednictvím elektronického formuláře (nadále modul Formulář),
	•	Vkládání dat Importem souboru UNL (nadále modul Import UNL),
	•	Webová služba Ubyport (nadále modul Webová služba).
Při vývoji aplikace byly zohledněny především rozsah oznamování (počet oznámených osob za měsíc), prostředky a síly, které má ubytovatel k dispozici a vybavení ubytovacího zařízení patřičnou výpočetní technikou.
Aplikace Ubyport dále umožňuje tvorbu Žádosti o registraci do Ubyport, jejímž výsledkem je vygenerovaný dokument v podobě PDF. (Více kapitola Registrace)
Tento manuál popisuje uživatelské prostředí, tudíž jen modul Formulář, modul Import UNL souboru včetně jeho kontroly a registraci uživatelů.


Popis aplikace
Ubyport je webová aplikace vystavená v síťovém prostředí Internet. URL adresa je uveřejněna na webovém portálu Policie České republiky v části Oznamování ubytování cizince ubytovatelem.

Podporované verze internetových prohlížečů:

	•	Safari 18.0.1 a vyšší
	•	Edge 127.0.2 a vyšší
	•	Firefox 131.0.0. a vyšší
	•	Chrome 131.0.6 a vyšší
	•	Opera 114.0.5 a vyšší
	•	Meta Quest Browser 31.4 a vyšší
	•	… a ostatní prohlížeče založené na jádru Chromium

Podmínky užívání Ubyport
Hlavní podmínkou užívání je registrace ubytovacího zařízení a získání přihlašovacích údajů (více kapitola Registrace). Uživatel je povinen dodržovat Provozní řád aplikace Ubyport, který je uveřejněn na portálu Policie.cz na adrese: Provozní řád Internetové aplikace Ubyport - Policie České republiky.

Podpora uživatelů
Kontaktní osoby podpory uživatelů dle jednotlivých kompetencí jsou uvedeny na adrese: Kontaktní osoby - Policie České republiky . 

REGISTRACE
Registrace ubytovacího zařízení je nezbytnou podmínkou pro získání přihlašovacích údajů do aplikace Ubyport a je založena na principu odeslání písemné žádosti ubytovatele na Ředitelství služby cizinecké policie (dále též „ŘSCP“).
Obecný postup žadatele o registraci ubytovacího zařízení probíhá ve třech krocích:
	•	Vyplnění formuláře registrace - minimálně povinné položky
	•	Vygenerování žádosti o registraci do souboru PDF
	•	Zaslání PDF souboru vygenerované žádosti na ŘSCP
Vyplnění formuláře registrace
V zájmu sjednocení formátu žádosti, kontroly povinných údajů, digitalizace dokumentu do formátu PDF, poskytnutí prostředí pro tvorbu dokumentu a přijatelnou nápovědu, byl vytvořen v Internetovém prostředí formulář, který po vyplnění automaticky zkontroluje potřebné údaje a vygeneruje dokument v digitální podobě, připravený k zaslání na ŘSCP.
Formulář žádosti o registraci zpřístupníme stisknutím tlačítka „Žádost o registraci nového ubytovacího zařízení“ (1) v záhlaví úvodní stránky aplikace Ubyport:


Podrobný postup pro vyplnění formuláře pro registraci ubytovacího zařízení je uveden v kapitole pod názvem „Podrobný popis registrace nového ubytovacího zařízení“.
Vygenerování žádosti o registraci do souboru PDF
Po vyplnění povinných položek formuláře se v dolní části obrazovky zpřístupní tlačítko „Vygenerovat žádost do dokumentu PDF“ (1). Po stisknutí tohoto tlačítka se uživateli zobrazí obrazovka s volbou stažení vygenerovaného PDF souboru do počítače žadatele (viz obrázek níže, označení 1). Po stažení dokumentu lze tento zaslat na ŘSCP několika způsoby uvedenými v následující kapitole.


Zaslání PDF souboru vygenerované žádosti na ŘSCP
Vygenerovaný a zkontrolovaný dokument „Žádost o registraci ubytovacího zařízení“ ve formátu PDF zašlete na Ředitelství služby cizinecké policie jednou z těchto cest:
	•	Elektronicky:
	•	Datovou schránkou na adresu ybndqw9
	•	E-mailem s certifikovaně elektronicky podepsaným PDF dokumentem na adresu reguby@pcr.cz 
	•	Certifikovaně elektronicky podepsaným e-mailem na adresu reguby@pcr.cz
	•	Písemnou formou:
	•	Podepsané žádosti o registraci v písemné formě zaslanou na Ředitelství služby cizinecké policie, Praha 3, Olšanská 2, 13051
	•	Osobním doručením podepsané žádosti o registraci na podatelnu Ředitelství služby cizinecké policie, Praha 3, Olšanská 2 (vchod A).
Pracoviště ŘSCP na základě doručené žádosti zašle ubytovateli přihlašovací údaje do Internetové aplikace Ubyport a to cestou kontaktů uvedených v žádosti (e-mail, datová schránka), nejpozději do 30 dní ode dne podání žádosti. Standardní reakce na žádost je do 1-3 pracovních dnů. V případě nejasností se pracovník ŘSCP zpracovávající formulář spojí s ubytovatelem (kontaktní osobou) prostřednictvím kontaktního telefonu, nebo kontaktní e-mailové adresy. 
Příslušné pracoviště ŘSCP tuto žádost zpracuje a na jejím základě budou vygenerovány a žadateli zpět zaslány potřebné přihlašovací údaje.

Více informací o registraci a provozu Internetové aplikace Ubyport lze nalézt na policejním portálu www.policie.cz, konkrétně na adrese portálu Ubyport: Oznamování ubytování cizince ubytovatelem - Policie České republiky, popřípadě v sekci „Nejčastější dotazy“ na adrese NEJČASTĚJŠÍ DOTAZY (FAQ) - problematika oznamování ubytovaných cizinců ubytovatelem - Policie České republiky.
Kontakt na linku podpory najdete na adrese: Kontaktní osoby - Policie České republiky .


Podrobný popis registrace nového ubytovacího zařízení
Proces vyplnění registračního formuláře se skládá ze tří částí, tj. do formuláře se postupně vyplňují:
	•	Obecné informace k ubytovacímu zařízení 
	•	Kontaktní informace ubytovatele
	•	Ostatní informace
Celý proces zahájíme na adrese https://ubyport.pcr.cz/UbyPort/ stisknutím tlačítka „Žádost o registraci nového ubytovacího zařízení“ (1) v záhlaví úvodní stránky aplikace Ubyport:


Následuje bezpečnostní ověření pro vyloučení robotů, kde uživatel zadá do textového pole  Opište kód z obrázku šestimístné číslo z obrázku Ověření Captcha. Viz obrázek níže

Po bezpečnostním ověření se zobrazí následující obrazovka:

Obecné informace k ubytovacímu zařízení
Obecné informace k ubytovacímu zařízení se týkají přímo ubytovacího zařízení, kde je ubytován klient. Pozor, nejedná se o sídlo firmy, která ubytovací zařízení provozuje! Pokud žadatel/ubytovatel provozuje více ubytovacích zařízení, je nutné registrovat každé z nich zvlášť.
Jednotlivé položky obecných informací k ubytovacímu zařízení (1):
	•	Název ubytovacího zařízení (2) – povinná položka
	•	Adresa ubytovacího zařízení (3) - povinná položka
	•	Číslo bytu – nepovinná položka (4)


Název ubytovacího zařízení (2)
Do názvu ubytovacího zařízení se uvádí místní název objektu. Například hotel Samec, ubytovna Karviná I, apartmán Monika, byt v soukromí, hájenka Eliška, U Tondy, Za větrem, … .

Adresa ubytovacího zařízení (3)
Adresu ubytovacího zařízení je nutno vyhledat v RÚIAN (Registr územní identifikace, adres a nemovitostí při ČUZK, více na adrese https://ruian.cz ). K tomuto účelu slouží textové pole opatřené vyhledávačem.
Doporučený postup:
Do textového pole položky „Adresa ubytovacího zařízení“ uvádíme obec (část obce), ulici a číslo domu. Pokud se vaše cílená adresa objeví v nabídce pod textovým polem, tak stisknutím řádku s požadovanou adresou potvrdíte výběr. Vybraná adresa se vypíše do textového pole kompletní.
Příklad adresy Praha, Olšanská 5:


Co když adresní místo nedisponuje názvem ulice?
To je běžná situace, kdy některé samoty, ale i celé obce nepoužívají názvy ulic. V tomto případě postačí do textového pole „Adresa ubytovacího zařízení“ zadat název obce a číslo popisné, popřípadě evidenční, pokud není číslo popisné vystaveno.

Příklad adresy bez označení ulice (obec Proseč-Obořiště číslo 1)



Číslo bytu (4)
Jedná se o nepovinnou položku, která se vyplňuje v případě, když ubytovacím zařízením je byt či apartmán v obytném objektu, jako je například pronajímaný byt v bytovém domě, apartmán ve větším objektu. V těchto případech je nutné označit číslo bytu/apartmánu.
Příklad:
Pokud pronajímám jeden byt s číslem 7 v bytovém domě, uvedu do položky je číslo 7.
V případě, že v obytném domě pronajímám bytů více, uvedu jejich čísla oddělená čárkou (2,15,16) nebo intervalem s výčtem čísel bytů (2, 5-9, 13).


Kontaktní informace ubytovatele (1)

V části Kontaktní informace ubytovatele jsou informace o ubytovateli a kontaktní osobě (osobách). Nachází se zde položky:
	•	IČO ubytovatele (2) – povinná položka 
	•	Kontaktní osoba (3) – nepovinná položka
	•	Jméno a příjmení osoby, která žádost podává (4) – nepovinná položka
	•	Telefonní kontakt (5) – nepovinná položka
	•	e-mail (6) – nepovinná položka
	•	ISDS (datová schránka (7)) – povinná položka, pokud jím ubytovatel disponuje

Část obrazovky „Kontaktní informace ubytovatele“ (1):


IČO ubytovatele (2)
Pro ztotožnění ubytovatele postačí uvést IČO (Identifikační číslo právnické osoby či podnikající fyzické osoby) ubytovatele. Jedná se o řadu 8 čísel.
Pokud ubytovatel nedisponuje IČO, uvádí se rodné číslo fyzické osoby. (IČO - identifikačního čísla právnické osoby či podnikající fyzické osoby; RČ – rodné číslo – vyplní fyzické osoby)

Kontaktní osoba (3)
Nepovinná položka pro případ, že ubytovatel pověřil pro komunikaci s Policií (v rámci oznamování ubytovaného cizince ubytovatelem) jinou osobu. Není-li uvedena kontaktní osoba, Policie komunikuje zásadně jen s ubytovatelem. Kontaktní osoba je dále spojena s telefonním kontaktem a e-mailem.

Jméno a příjmení osoby, která žádost podává (4)
Nepovinná položka, která umožňuje uvést osobu, která v zastoupení podává žádost o registraci ubytovatele. Jedná se hlavně o případ, kdy je písemnost žádosti podána osobně. Pokud žádost osobně předává sám ubytovatel, nebo kontaktní osoba, není potřeba tuto položku vyplňovat.

Telefonní kontakt (5)
Telefonní spojení na ubytovatele nebo kontaktní osobu. Předpokládá se, že pokud není uvedena kontaktní osoba (ubytovatel vše vyřizuje osobně), tak je to telefonní kontakt ubytovatele. V případě uvedení kontaktní osoby se předpokládá, že telefonní spojení je na kontaktní osobu.
Proč zadávat telefonní kontakt?
Uvedený telefonní kontakt je brán jako důvěryhodný a lze jeho prostřednictvím komunikovat s pracovníky PČR (Policie České republiky) bez nutné autentizace.

E-mail (6)
E-mailové spojení na ubytovatele nebo kontaktní osobu. Předpokládá se, že pokud není uvedena kontaktní osoba (ubytovatel vše vyřizuje osobně), tak je to e-mail ubytovatele. V případě uvedení kontaktní osoby se předpokládá, že e-mail je na kontaktní osobu. Lze zadat i více e-mailových adres.
Proč zadávat e-mail?
Uvedený e-mail je brán jako důvěryhodný a lze jeho prostřednictvím komunikovat s pracovníky PČR (Policie České republiky) bez nutné autentizace.

ISDS (datová schrána) (7)
Povinná položka pro ubytovatele - držitele datové schránky. Zadává se kód ISDS (Informační systém datových schránek) v podobě 7 znaků. Více informací o ISDS najdete zde: Informační systém datových schránek [Architektura eGovernmentu ČR] .
Pokud ubytovatel nedisponuje datovou schránkou, stiskneme na zelené zatržítko, které znepřístupní textové pole uvedené položky (viz obrázek výše).

Ostatní informace
V části „Ostatní informace“ se nacházejí údaje:
	•	Počet požadovaných údajů 
	•	Poznámka
	•	V případě žádosti o přihlašovací údaje pro modul Webová služba dále:
	•	Používaná aplikace – název aplikace
	•	Používaná aplikace – tvůrce programu

Počet požadovaných údajů 
Na základě zaslané žádosti o registraci ubytovacího zařízení pracovníci ŘSCP vygenerují přihlašovací údaje pro ubytovatele, tj. vytvoří přihlašovací účet. Je-li z organizačních důvodů, či jiných potřeb provozu ubytovacího zařízení potřeba vygenerovat více přihlašovacích údajů (například pro více recepčních), lze z rozevíracího seznamu vybrat požadovaný počet. 
Příklad výběru přihlašovacích údajů:


Pokud ubytovatel disponuje programovým vybavením, které umožňuje přímou komunikaci serverů prostřednictvím webové služby Ubyport, vybere ze seznamu položku s názvem „Účet pro ubytovatele + 1x Účet pro robotické zasílání dat“. Po výběru této varianty formulář přidá další dvě položky, ve kterých ubytovatel uvede název programu a jeho výrobce. Důvodem je podmínka certifikace programového vybavení pro přímou komunikaci prostřednictvím webové služby, kterou výrobci programu musí předem splnit. 

Ukázka vyplnění položek v případě žádosti o registraci ubytovacího zařízení, které využívá možnost komunikace přes modul Ubyport WS (webová služba - 1):


Používaná aplikace – název aplikace (3)
V případě žádosti o účet pro robotické zpracování dat prostřednictvím modulu Webová služba Ubyport, uvede žadatel název programu používaného k přenosu dat.

Používaná aplikace – tvůrce programu (4)
V případě žádosti o účet pro robotické zpracování dat prostřednictvím modulu Webová služba Ubyport, uvede žadatel výrobce programu používaného k přenosu dat.

Poznámka (5)
Nepovinná textová položka pro potřeby žadatele, kde může uvést další upřesňující/doplňující informace, které pokládá za nutné uvést v žádosti. 

Generování dokumentu Žádosti o registraci ubytovacího zařízení ve formátu PDF
 Po vyplnění všech patřičných položek formuláře lze stisknout tlačítko „Vygenerovat žádost do dokumentu PDF“.  
Ukázka umístění tlačítka „Vygenerovat žádost do dokumentu PDF“ (1):
Pokud je formulář vyplněn korektně a automatizovaná kontrola dat nenalezne chybu, uloží se data a Ubyport vygeneruje PDF soubor. Zároveň se zobrazí nová obrazovka potvrzující korektní zpracování s možností stažení PDF souboru do počítač žadatele. 
Ukázka obrazovky pro stažení Žádosti o registraci ubytovacího zařízení ve formátu PDF do PC žadatele:


Stisknutím tlačítka “Stažení dokumentu Žádosti o registraci“ (1) se PDF soubor stáhne do počítač žadatele. Například v Internetovém prohlížeči MS Edge se uživateli zobrazí následná informace s možností zobrazení souboru:

V případě, že neví žadatel, kam se mu žádost uložila, že možné zobrazit seznam posledně stahovaných souborů s možností přechodu do složky přímo k souboru pomocí zkratky: CTRL+J, která standardně funguje u všech prohlížečů.
Takto vygenerovaná a stažená žádost o registraci ubytovacího zařízení ve formátu PDF se zašle na Ředitelství služby cizinecké policie jednou z cest uvedených v kapitole s názvem „Zaslání PDF souboru vygenerované žádosti na ŘSCP“. 
Kopii žádosti, tedy dokument ve formátu PDF, doporučujeme uschovat v jakékoliv podobě pro případné další využití při kontaktu s pracovníky ŘSCP.
Po doručení PDF dokumentu žádosti na pracoviště ŘSCP jeho pracovníci vygenerují uživatelské přihlašovací údaje a zašlou zpět žadateli e-mailovou zprávou, nebo datovou schránkou nejdéle do 30 dnů od zaslání žádosti (e-mailem, ISDS, osobně) na ŘSCP. 



Přihlášení do aplikace Ubyport
Podmínkou pro úspěšné přihlášení do Ubyport je registrace ubytovacího zařízení a získání potřebných přihlašovacích údajů, poté postupujeme dle následujících kroků:
	•	Otevřeme si libovolný podporovaný prohlížeč (Edge, Firefox, Safari či jiný)
	•	Do prohlížeče zadáme následující URL adresu a stiskneme Enter: https://ubyport.pcr.cz/UbyPort/
Následně se nám zobrazí úvodní přihlašovací stránka Ubyportu:

	•	Vyplníme formulář pro přihlášení do Ubyport (1) včetně opsání čísla na obrázku (Oveření Captcha)
	•	Poté stiskneme tlačítko „Přihlásit“(2)


Jakmile se zobrazí hlavní stránka („Seznam vašich registrovaných ubytovacích zařízení“), přihlášení proběhlo úspěšně:



Hlavní stránka aplikace
Hlavní stránka se objeví automaticky po přihlášení do aplikace. Tuto stránku lze rozdělit na dvě základní části a to:
1. Hlavní menu (modře podbarvené záhlaví) – obsahuje základní ovládací prvky
2. Zobrazení seznamu zařízení daného uživatele včetně vyhledávácího pole


Hlavní menu
Hlavní menu obsahuje prvky, které slouží jak pro informaci, tak pro ovládání aplikace či přístup do dalších částí. Tyto prvky jsou následující (viz obrázek) :
1. Informace o přihlášeném uživateli – obsahuje login uživatele,
2. Tlačítko „Odhlásit se“ – provede ruční odhlášení z aplikace Ubyport (viz kapitola odhlášení),
3. Informace o automatickém odhlášení – informace za jak dlouho (v minutách) dojde k odhlášení,
4. Tlačítko „Obnovit přihlášení“ - po stisknutí obnoví dobu odhlášení na 20 minut (viz kapitola Odhlášení z aplikace Ubyport),
5. Tlačítko (ikona )„O Aplikaci“ – po stisknutí se otevře okno se základními informacemi o aplikaci,
6. tlačítko (ikona) „Provozní řád Ubyportu“ - po stisknutí se otevře „Provozní řád Ubyport“ uveřejněný na portálu www.policie.cz.


Seznam ubytovacích zařízení
Seznam obsahuje následující části:
1. Vyhledávací či filtrovací pole – umožňuje zredukovat počet vyhledaných zařízení vepsáním klíčového slova, respektive řetězce znaků (1) – dále viz kapitola Vyhledávání v seznamu
2. Samotný seznam ubytovacích zařízení – výpis registrovaných ubytovacích zařízení daného uživatele umožňující výběr konkrétního zařízení (2)



Vyhledávání v seznamu
Seznam obsahuje filtr (vyhledávání), který umožňuje zredukovat počet zobrazených výsledků v případě, že uživatel má velké množství ubytovacích zařízení. Vyhledávání je plně fultextové, takže stačí napsat libovolný sled znaků a automaticky se ihned zobrazují odpovídající výsledky:


Výběr položky ze seznamu
Abychom mohli vkládat data cizinců, je třeba nejprve vybrat příslušné ubytovací zařízení. Zařízení vybereme tak, že stiskneme na jméno zařízení čímž se výběr označí zeleným zatržítkem (1)
Jakmile provedeme výběr ubytovacího zařízení, zobrazí se další možnosti v podobě tlačítek (2):

Stisknutím příslušného tlačítka (2) můžeme pokračovat v dalších aktivitách a to stiskem tlačítka:
	•	„Pořizování dat (formulář)“ - vkládat data pomocí internetového formuláře,
	•	„Import dat (UNL soubor)“ – nahrát do aplikace předem připravený UNL soubor,
	•	„Statistické údaje“ – zobrazovat statistické údaje vázané k uživateli, ubytovacímu zařízení apod..



Manuální vkládání dat prostřednictvím elektronického formuláře  ( nadále modul Formulář)
Formulář pro manuální vkládání dat je určen především pro ubytovací zařízení s menší ubytovací kapacitou a absencí vlastního programového vybavení pro evidenci ubytovaných osob a s předpokládanou frekvencí ubytovaných osob řádově v jednotkách za měsíc. 

Pravidla pro vyplňování jednotlivých položek 
Pravidla pro vyplňování jednotlivých položek jsou stanovena provozním řádem. Stručný popis obecných pravidel a detailní popis jednotlivých rubrik je uveřejněn na webové stránce Policie České republiky na adrese Vyplňování přihlašovacího tiskopisu - Policie České republiky. 

Obecný postup zadávání dat v modulu Formulář
	•	Vyplnění formuláře daty o ubytovaném cizinci
	•	Vložení (převedení) dat z formuláře do seznamu
	•	Odeslání seznamu ke zpracování
	•	Vygenerování a stažení doručenky 

Vyplnění formuláře daty o ubytovaném cizinci
Po přihlášení do Ubyportu se objeví obrazovka výběru ubytovacího zařízení, kde je nutné provést výběr stisknutím řádku s údaji ubytovacího zařízení.


Označením (výběrem) ubytovacího zařízení se zpřístupní výběr funkcionalit Pořizování dat (formulář) (1) a Import dat   (UNL soubor) (2). 

Stisknutím tlačítka „Pořizování dat“ (1) se objeví obrazovka formuláře pro vkládání dat. V případě potřeby návratu na předešlou obrazovku, je možné použít tlačítko v horní části formuláře s názvem Vybrat jiné ubytovací zařízení.





Jednotlivé položky formuláře

Příjmení a Jméno (1-2):
Uživatel vyplní Příjmení a Jméno dle cestovního dokladu. V případě výskytu některých speciálních znaků, lze použít Mapu speciálních znaků pro Příjmení a Jméno, která se zpřístupní tisknutím tlačítka se symbolem klávesnice umístěným v řádku položky, napravo od vstupního pole.


Datum narození (3):
Datum narození se vyplňuje ve formátu den.měsíc.rok (maska: DD.MM.RRRR; příklad 02.06.2001).  

Státní občanství (4):
Státní občanství se zadává formou výběru ze seznamu. Samotný seznam lze pro lepší orientaci abecedně seřadit dle třípísmenné zkratky, nebo podle zkráceného názvu státu.   Volba se provádí stisknutím tlačítka „Kód státu“ nebo „Název státu“.  Volbu je možné udělat psaním na klávesnici, v poli nabídky Státní občanství, je-li toto pole aktivní (je na něm fokus, což je poznat podle slabě tenkého modrého orámování pole). Například napíšeme na klávesnici DEU a vybere se Německo.

Účel pobytu cizince (5):
Účel pobytu cizince se vybírá z otevíracího seznamu, kde jsou uvedeny zákonné důvody účelu pobytu na území České republiky.

Datum ubytování Od (6):
Datum od kdy je cizinec ubytován lze zadat buď ručně zápisem data ve formátu den.měsíc.rok (25.09.2024), nebo výběrem z kalendáře, který se zpřístupní stisknutím symbolu kalendáře v uvedené položce. Tato položka nedovolí zadat budoucí datum, jelikož oznamovaný cizinec musí být již ubytován v Ubytovacím zařízení.
Datum ubytování Do (6):
Datum do kdy je cizinec ubytován lze zadat buď ručně zápisem data ve formátu den.měsíc.rok (29.09.2024), nebo vybrat v kalendáři, který se zpřístupní stisknutím symbolu kalendáře v uvedené položce. Tato položka nedovolí zadat datum stejné, nebo historicky menší než Datum ubytování Od. (Datum ubytování Do > Datum ubytování Od) 

Číslo cestovního dokladu (7):
Číslo cestovního dokladu se uvádí ve formátu, v jakém je uvedeno v příslušném dokladu bez mezer o minimální délce 6 znaků. Neuvádí se žádné doplňující informace, jako například „Občanka“, „Pas“, … .

Číslo víza (8):
 Uvádí se v případě, že je v cestovním dokladu uvedeno vízum u osob s vízovou povinností. K samotnému číslu víza se neuvádí doplňující informace.

Trvalé bydliště v zahraničí (9):
Uživatel vyplní adresu trvalého bydliště cizince v zahraničí. Doporučený formát – stát, město, ulice, číslo domovní.

Poznámka (10):
Prostor pro doplňující informace o ubytovaném cizinci nebo zvláštnostech při vyplňování údajů o cizinci.

Vložení dat z formuláře do seznamu (1)
Po korektním vyplnění všech údajů o cizinci je možno stisknout tlačítko „Přidat cizince do seznamu“ (1). Před přidáním do seznamu zkontroluje aplikace Ubyport korektnost všech vyplněných položek. Po kontrole dat vloží údaje do seznamu, který se nachází pod formulářem. Maximální délka seznamu je 10 osob. 

Životnost seznamu:
Seznam je k dispozici v rámci ubytovacího zařízení i v době, kdy se uživatel odhlásí. Seznam zanikne odesláním ke zpracování Ubyportem. V praxi to znamená, že pokud se uživatel odhlásí, nebo ztratí konektivitu, tak se seznam po opětovném přihlášení objeví v podobě, jako před odchodem z aplikace Ubyport.

Odeslání seznamu ke zpracování (2)
Při vložení všech ubytovaných cizinců do seznamu, nebo při dovršení 10 vložených osob uživatel seznam odešle ke zpracování do aplikace Ubyport stisknutím tlačítka „Odeslat seznam (2)“. Po zpracování dat se objeví obrazovka o úspěšném odeslání dat do aplikace Ubyport a možnosti stažení doručenky (potvrzení o provedeném oznámení ubytovaných cizinců v aplikaci Ubyport). 

Vygenerování a stažení doručenky 
Stisknutím tlačítka „Stáhnout doručenku ve formátu PDF“ (1) se provede stažení dokumentu do zařízení uživatele. V případě prohlížeče MS Edge se objeví v pravém horním rohu informace o provedeném úkonu (2).



Informace:
V případě, že neví žadatel, kam se mu žádost uložila, že možné zobrazit seznam posledně stahovaných souborů s možností přechodu do složky přímo k souboru pomocí zkratky: CTRL+J, která standardně funguje u všech prohlížečů. 
Doručenku doporučujeme ukládat na bezpečné místo pro účely případné kontroly ze strany cizinecké policie.


---


Další možnosti práce na této obrazovce:
V uvedené obrazovce je možno dále pokračovat ve vkládání dalších ubytovaných cizinců stisknutím tlačítka „Pokračovat ve vkládání dat k danému zařízení“ (4), nebo popřípadě pokračovat na výběr dalšího ubytovacího zařízení volbou tlačítka „Vybrat jiné ubytovací zařízení“ (3).
Stisknutím tlačítka „Vraťte se na úvodní obrazovku“ (5), dojde k odhlášení a ukončení práce v Aplikaci Ubyport.



Vkládání dat Importem souboru UNL (dále modul Import UNL)

Druhým modulem, kterým je možné odesílat data ubytovaných cizinců na cizineckou policii je modul „Import dat (UNL soubor)“. Tlačítko pro „Import dat (UNL soubor)“ se zobrazí po výběru Ubytovacího zařízení (UZ) z nabídky, někteří ubytovatelé mají pouze jediné UZ, pak nabídka obsahuje pouze jedinou položku.

Načtení souboru
Stisknutím tlačítka „Import dat (UNL soubor)“ se dostanete na obrazovku, která zobrazuje informaci „Soubor nevybrán“, protože toto ještě nebylo provedeno.

Na této obrazovce je možné pomocí tlačítka „Vybrat soubor“ najít a načíst UNL souhlas, který se chystáte importovat na cizineckou policii. S výhodou je možné použít i metodu „Drag and Drop“ (táhni a pusť), kterou je možné rovněž UNL soubor najít a připravit k načtení.
Po úspěšném označení souboru, který se chystáte odeslat, se zobrazí jeho název na obrazovce vedle tlačítka „Vybrat soubor“.

UNL soubor - příklad:
 
Odeslání souboru
Po stisknutí tlačítka „Odeslat soubor“, je tento odeslán na zpracování. Pokud je soubor bezvadný, je rovnou odeslán na zpracování a je možné stáhnout Doručenku.


Doručenka - příklad:



V případě, že jsou v UNL souboru nalezeny chyby, tyto jsou zobrazeny ve statistickém shrnutí importu dat jako koláčový diagram (Statistika):


Také jsou zobrazeny na obrazovce jako: „Seznam ubytovaných cizinců, u kterých se vyskytla chyba, v zařízení“ (Seznam).


Seznam nekorektních údajů
V Seznamu jsou jednotlivé konkrétní chyby označeny červeně a je možné tyto záznamy opravovat nebo smazat. Záznamy se opravují modrým tlačítkem s tužkou u každého jednotlivého záznamu a mažou se červeným tlačítkem s křížkem u každého jednotlivého záznamu.

Tlačítko pro editaci záznamu – modré s tužkou:
Tlačítko pro smazání záznamu – červené s křížkem:

V případě že se uživatel rozhodně odeslat pouze bezchybné záznamy a vadné zrušit, použije tlačítko: „Zrušení všech chybných záznamů“:

V tom případě jsou přijaty na zpracování pouze bezvadné záznamy a pro ně je oznamovací povinnost splněna. Pro zrušené záznamy oznamovací povinnost splněna není a stále trvá povinnost oznámit ubytování cizince.

Oprava chyb
V případě opravy chyby záznamu se data přesunou do editačního formuláře, shodného s formulářem, který se používá v prvním modulu „Formulář“.


Odeslání seznamu
Po úspěšné opravě se záznamy postupně přesouvají mezi zpracované záznamy, což zobrazuje statistické shrnutí jako koláčový diagram (Statistika) nad Seznamem.

V případě neúspěšné opravy zůstávají v editačním formuláři, dokud nejsou všechny chyby opraveny. V případě, že uživatel potřebuje editaci opustit bez opravy, použije tlačítko „Původní hodnoty“, vadný záznam se vrátí bez opravy do Seznamu, ale protože není opravený, nelze data odeslat na zpracování.


Barevné označení stavu záznamů je realizováno barevným proužkem vlevo u jednotlivých záznamů v Seznamu. Červeně jsou označeny záznamy vadné, Žlutě jsou označeny záznamy duplicitní a korektní záznamy v Seznamu již nejsou, ale jsou označeny Zeleně ve Statistice nad Seznamem.




Tak jak bylo možné smazat všechny vadné záznamy pomocí tlačítka „Zrušení všech chybných záznamů“, tak je možné smazat všechny duplicitní záznamy pomocí tlačítka „Zrušení všech duplicitních záznamů“, nebo je možné všechny duplicity řešit jednotlivě pomocí editačního tlačítka s tužkou a chyby duplicit opravit, nebo smazat červeným tlačítkem pro smazání.

Po opravě všech chyb a duplicit se Seznam vyprázdní,

všechny záznamy ve Statistice, v koláčovém grafu, jsou označeny zeleně, všechna data jsou připravena k odeslání na cizineckou policii, což se provede tlačítkem „Odeslat seznam“.

Po odeslání Seznamu si může uživatel stáhnout Doručenku (pdf soubor), která je potvrzením, že všechny jeho záznamy byly korektně odeslány.













Statistiky
Aplikace Ubyport umožňuje uživateli zobrazovat některé statistické údaje a přehledy související s aktivitou uživatele a provozem konkrétního ubytovacího zařízení.
Všechny statistiky, ve kterých se vyskytuje časová řada, končí posledním dnem předcházejícího měsíce.
	•	Statistika přihlášeného uživatele:

















	•	Statistika přihlášeného uživatele a ubytovacího zařízení:






Odhlášení z aplikace Ubyport
Odhlášení z aplikace Ubyport je možné dvěma způsoby: 
	•	stisknutím tlačítka „Odhlásit se“
	•	automatické odhlášení po uplynutí nastavené doby nečinnosti (viz dále).

Odhlášení pomocí tlačítka „Odhlásit se“
1. Stiskneme tlačítko „Odhlásit se“



2. Potvrdíme odhlášení tlačítkem „Odhlásit se“

Stisknutím křížku či tlačítka „Zpět na současnou stránku“ odhlášení zrušíme.

Automatické odhlášení
V případě, že uživatel s aplikací nepracuje delší dobu, dojde k automatickému odhlášení. K automatickému odhlášení dojde za 20 min nečinnosti při práci s programem tj. neodesílání dat.  Odpočet lze nalézt v pravé částí horního menu.


V případě, že potřebujete čas odhlášení nastavit opět na původních 20 min, stačí stisknout tlačítko „Obnovit přihlášení “ v pravé části horního menu.

## Source: ubyport.doc

Technický popis webové služby Ubyport
Příloha č. 5 dokumentu Provozní řád Internetové aplikace Ubyport
Aktualizace k 19. 6. 2019
Počet příloh: 1
OIPIT - Praha 2019
PPo

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 2/17
Obsah
1. Účel dokumentu ........................................................................................................................... 3
2. Účel služby................................................................................................................................... 4
2.1 Přístup................................................................................................................................... 4
3. Seznam metod............................................................................................................................. 5
4. Popis tříd a výčtových proměnných .............................................................................................. 6
4.1 Druh číselníku ....................................................................................................................... 6
4.2 Datové typy - třídy ................................................................................................................. 6
5. Příklady volání.............................................................................................................................. 8
5.1 Volání metody ZapisUbytovane............................................................................................. 8
5.1.1 Návrat s věcnou chybou .................................................................................................... 8
5.1.2 Návrat při havárii služby..................................................................................................... 9
5.1.3 Ukázka serializované třídy na vstupu............................................................................... 10
5.1.4 Ukázka serializované třídy výstupu.................................................................................. 10
5.2 Volání TestDostupnosti ....................................................................................................... 11
5.3 Volání DejMiCiselnik ........................................................................................................... 11
5.3.1 Státní příslušnosti ............................................................................................................ 11
5.3.2 Chyby .............................................................................................................................. 12
5.3.3 Důvody pobytu................................................................................................................. 13
5.4 Volání MaxDelkaSeznamu .................................................................................................. 15
6. WSDL......................................................................................................................................... 16
7. Shrnutí ....................................................................................................................................... 17

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 3/17
1. Účel dokumentu
Tento dokument poskytuje informace potřebné pro vytvoření klienta služby WS_UBY a neřeší technické
specifikace spojení mezi klientem a serverem (verze TSL SSL, případně verze SOAP, způsob
autentizace atd..). Pro porozumění textu je vhodná znalost jazyka C#, ale není nezbytně nutná.
Příklady použití jednotlivých metod jsou vyrobeny aplikací WCFTestClient a nemusí být v jiném
prostředí funkční. 

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 4/17
2. Účel služby
Webová služba WS_UBY slouží k automatizovanému odesílání hlášení z informačního systému
ubytovatele do informačního systému UBY. Služba je založena na protokolu SOAP.
2.1 Přístup
Přístup ke službě je autentizován prostřednictvím Windows NTLM.
Uživatel má přidělené pevné jméno a heslo. Jméno musí souhlasit se zadávanou hodnotou uUzivatel.
Data za ubytovací zařízení může posílat jen ten uživatel, kterému byl (pro dané ubytovací zařízení - dle
uIdub) přidělen účet (jméno a heslo).
Parametr AutenticationCode není používán a je připraven na případnou změnu nebo rozšíření
autentizace. V současné době se tato položka nepoužívá, ale formálně musí být vyplněna (nesmí být
prázdná a může v ní být cokoliv, je doporučen znak „X„).
Služby jsou vystaveny v CMS2 a jejich URL je:
Testovací prostředí:
https://ubyport.pcr.cz/ws_uby_test/ws_uby.svc
Produkční prostředí
https://ubyport.pcr.cz/ws_uby/ws_uby.svc
Aktuální WSDL je možné získat voláním výše uvedené url rozšířené o parametr ?singleWsdl
Poznámka:
Vzhledem k tomu, že mohou probíhat změny komunikační infrastruktury, případné změny URL nejsou vyloučeny. Informace
o změnách budou zveřejňovány na webových stránkách Ministerstva vnitra ČR, které je správcem síťové infrastruktury.

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 5/17
3. Seznam metod
Metoda popis
bool TestDostupnosti(string
AutentificationCode);
Ověří dostupnost služby včetně backendu.
int MaximalniDelkaSeznamu(string
AutentificationCode);
Vrátí maximální délku seznamu ubytovaných
pro vkládání. Delší pole nebude vloženo a
služba vrátí chybu
List<CiselnikType> DejMiCiselnik( string
AutentificationCode,

DruhCislelniku CoChci);
Vypíše příslušný číselník daný výčtovým typem.
Z důvodu různé struktury číselníků, jsou tyto
struktury ve výpisu unifikovány.
Chyby ZapisUbytovane(string
AutentificationCode,
 SeznamUbytovanych Seznam);
Vloží seznam ubytovaných a vrátí záznam o
zpracování a to jak formou seznamu chyb
v datové třídě tak v PDF dokumentu.
Parametr AutentificationCode je rezerva, která není zatím využita, ale musí být formálně vyplněna, je
doporučen znak „X“. 

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 6/17
4. Popis tříd a výčtových proměnných
4.1 Druh číselníku
Výčtový typ DruhCislelniku určuje, který číselník bude vypsán.
Typ Význam
Staty Číselník státních příslušností
UcelyPobytu Číselník účelů pobytů
Chyby Chybovník
4.2 Datové typy - třídy
Datové typy – třídy jsou popsány v tabulce. I když jsou proměnné typu string ve WSDL označeny
nillable="true" neznamená to, že mohou být null vždy. Jedná se o vnitřní popis vytvořený generátorem
WSDL, protože položka typu string může formálně nabývat hodnotu null.
Pozor je rozdíl mezi položkou s hodnotou null a prázdnou položkou („“).
 Třída CiselnikType
Typ Jméno Význam
Int (32 bit) Id Číselný identifikátor
String Kod2 Dvouznakový kód *)
String Kod3 Tříznakový kód *)
String TextCZ Český název úplný *)
String TextKratkyCZ Český název zkrácený *)
String TextENG Anglický název úplný *)
String TextKratkyENG Anglický název zkrácený *)
String PlatiOd Datum od kdy kód platí **)
String PlatiDo Datum do kdy kód platí **)

*) platí jen pro číselníky států, u číselníku důvodů je použito jen kod2 a TextCZ
u chybovníku je použit kod 2 pro kód chyby a v ostatních položkách je výklad a význam.
**) může být i prázdné případně nevyplněné.
Třída SeznamUbytovanych obsahuje informace o ubytovateli a seznam ubytovaných.
Typ Jméno Význam
Boolean VracetPDF Příznak oznamující, že
ubytovatel chce v odpovědi
také PDF dokumenty *)
String uIdub Identifikační číslo
ubytovatele
String uMark Zkratka ubytovatele
String uName Název ubytovatele
String uCont Kontakt na ubytovatele
String uOkr Okres z adresy ubytovatele
String uOb Obec z adresy ubytovatele

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 7/17
String uObCa Část obce z adresy
ubytovatele
String UStr Ulice z adresy ubytovatele
String uHomN Domovní číslo z adresy
ubytovatele (číslo popisné,
tj. to červené) max. 4
číslice a E pro číslo
evidenční
String uOriN Orientační číslo z adresy
ubytovatele (tj. to modré)
max. 3 číslice a jedno
písmeno
String uPsc Poštovní směrovací číslo
z adresy ubytovatele. 5
číslic.
Seznam Ubytovani Seznam tříd Ubytovany
 *) doplněno na základě změnového požadavku z prosince 2016


Třída Ubytovany obsahuje osobní údaje o ubytovaném cizinci
Typ Jméno Význam
DateTime cFrom Od kdy je ubytován, musí být
vždy reálné datum.
DateTime cUntil Do kdy je ubytován, musí být
vždy reálné datum.
String cSurN Příjmení - přípustné jen
znaky abecedy, znak apostrof
" ' " a spojník "-"
String cFirstN Jméno - přípustné jen znaky
abecedy, znak apostrof " ' "
a spojník "-"
String cDate Datum narození ve tvaru
DDMMRRRR, přípustný tvar je i
0000RRRR nebo 00DDRRRR
String cPlac Místo narození, 48 znaků –
Nevyužito. Položka se
nepoužívá.
String cNati Státní občanství podle
číselníku. V číselníku staty
je to položka Kod3.
String cDocN Číslo cestovního dokladu, min
4 max. 30 znaků, u dětí
zapsaných v pasu rodičů se
vyplní slovo „INPASS“ a číslo
dokladu rodiče se zapíše do
poznámky. Je-li INPASS pak
nesmí být poznámka prázdná.
String cVisN Číslo víza, max. 15 znaků
nepovinné
String cResi Bydliště v domovském státě,
max. 128 znaků - Nepovinné

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 8/17
Int? (32 bit nullable) cPurp Účel pobytu podle číselníku
účelu cesty – nepovinné,
není-li vyplněno, použije se
defaultní hodnota 99
String cSpz RZ vozidla, kterým cizinec
přijel, max. 15 znaků -
Nevyužito. Položka se
nepoužívá.
String cNote Poznámka k záznamu max. 255
znaků alfanumerická položka –
neformalizováno.
Třída Chyby obsahuje návratové údaje o tom, zda a jak se povedl zápis seznamu. Pozor některé
chyby jsou vraceny jako FaultException viz příklad níže (5.1.3).
Typ Název Význam
String ChybyHlavicky Čísla chyb oddělené ;
popisující chyby ve třídě
SeznamUbytovanych
String DokumentPotvrzeni PDF dokument ve tvaru
basecode64 obsahující
potvrzení o zpracování dat
String DokumentChybyPotvrzeni PDF dokument ve tvaru
basecode64 obsahující chyby
ve zpracovaných datech
String ChybyZaznamu Čísla chyb jednotlivých
záznamů v seznamu Ubytovany
oddělená ; (pokud má jedna
položka více chyb)
String PseudoRazitko Značka, která je obsažena
v PDF dokumentu.
5. Příklady volání
5.1 Volání metody ZapisUbytovane
5.1.1 Návrat s věcnou chybou
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header>
 <Action s:mustUnderstand="1"
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/ZapisUbytovane</Action>
 </s:Header>
 <s:Body>
 <ZapisUbytovane xmlns="http://UBY.pcr.cz/WS_UBY">
 <Seznam xmlns:d4p1="http://schemas.datacontract.org/2004/07/WS_UBY"
xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
 <d4p1:Ubytovani>
 <d4p1:Ubytovany>
 <d4p1:cDate>01.01.1911</d4p1:cDate>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 9/17
 <d4p1:cDocN>aaa</d4p1:cDocN>
 <d4p1:cFirstN>aaa</d4p1:cFirstN>
 <d4p1:cFrom>2016-04-27T09:28:00</d4p1:cFrom>
 <d4p1:cNati>AFG</d4p1:cNati>
 <d4p1:cNote i:nil="true" />
 <d4p1:cPlac i:nil="true" />
 <d4p1:cPurp i:nil="true" />
 <d4p1:cResi i:nil="true" />
 <d4p1:cSpz i:nil="true" />
 <d4p1:cSurN i:nil="true" />
 <d4p1:cUntil>2016-04-27T09:28:00</d4p1:cUntil>
 <d4p1:cVisN i:nil="true" />
 </d4p1:Ubytovany>
 </d4p1:Ubytovani>
 <d4p1:uCont>aaa</d4p1:uCont>
 <d4p1:uHomN>aaa</d4p1:uHomN>
 <d4p1:uIdub>100227887600</d4p1:uIdub>
 <d4p1:uMark>CZGFW</d4p1:uMark>
 <d4p1:uName i:nil="true" />
 <d4p1:uOb i:nil="true" />
 <d4p1:uObCa i:nil="true" />
 <d4p1:uOkr i:nil="true" />
 <d4p1:uOriN i:nil="true" />
 <d4p1:uPsc>14200</d4p1:uPsc>
 <d4p1:uStr i:nil="true" />
 </Seznam>
 </ZapisUbytovane>
 </s:Body>
</s:Envelope>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <ZapisUbytovaneResponse xmlns="http://UBY.pcr.cz/WS_UBY">
 <ZapisUbytovaneResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY"
xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
 <a:ChybyHlavicky>5;6;7;8;9;10;11;12;13;</a:ChybyHlavicky>
 <a:ChybyZaznamu xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
 <b:string>;112;106;</b:string>
 </a:ChybyZaznamu>
 </ZapisUbytovaneResult>
 </ZapisUbytovaneResponse>
 </s:Body>
</s:Envelope>
5.1.2 Návrat při havárii služby
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <s:Fault>
 <faultcode>s:Chyba běhu programu</faultcode>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 10/17
 <faultstring xml:lang="cs-CZ">Server was unable to process request. ---&gt; Length cannot be
less than zero.
Parameter name: length</faultstring>
 </s:Fault>
 </s:Body>
</s:Envelope>
5.1.3 Ukázka serializované třídy na vstupu
<?xml version="1.0"?>
<SeznamUbytovanych xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
 <VracetPDF>false</VracetPDF>
 <uIdub>125</uIdub>
 <uMark>aaa</uMark>
 <uName>U Dubu</uName>
 <uCont>test@seznam.cz</uCont>
 <uOkr>Praha</uOkr>
 <uOb>Praha</uOb>
 <uObCa>Nusle</uObCa>
 <uStr>Lennonova</uStr>
 <uHomN>123</uHomN>
 <uOriN>152</uOriN>
 <uPsc>1110</uPsc>
 <Ubytovani>
 <Ubytovany>
 <cFrom>2019-06-25T11:09:00</cFrom>
 <cUntil>2019-06-25T11:09:00</cUntil>
 <cSurN>Abbas</cSurN>
 <cFirstN>Hassan</cFirstN>
 <cDate>00001950</cDate>
 <cNati>UK</cNati>
 <cDocN>aa123</cDocN>
 <cVisN>123456</cVisN>
 <cResi>Uzgorod</cResi>
 <cPurp xsi:nil="true" />
 </Ubytovany>
 </Ubytovani>
</SeznamUbytovanych>
5.1.4 Ukázka serializované třídy výstupu
PDF v basecode64 je zkrácen.
<?xml version="1.0"?>
<Chyby xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<ChybyHlavicky>5;7;8;9;10;11;12;13;</ChybyHlavicky>
<DokumentPotvrzeni>JVBERi0xLjQKJdP0zOEKJSBQREZzaGFycCBWZXJzaW9uIDEuMzIuMj
….. zde je několik kB textu a proto byl vynechán …
emUgMTkKPj4Kc3RhcnR4cmVmCjU1MzE2CiUlRU9GCg==</DokumentPotvrzeni>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 11/17
<ChybyZaznamu>
 <string>;</string>
</ChybyZaznamu>
<PseudoRazirko>F8EA613D-C8C5-4671-924D-EE4F8588E08D</PseudoRazirko>
</Chyby>
5.2 Volání TestDostupnosti
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header>
 <Action s:mustUnderstand="1"
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/TestDostupnosti</Action>
 </s:Header>
 <s:Body>
 <TestDostupnosti xmlns="http://UBY.pcr.cz/WS_UBY" />
 </s:Body>
</s:Envelope>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <TestDostupnostiResponse xmlns="http://UBY.pcr.cz/WS_UBY">
 <TestDostupnostiResult>true</TestDostupnostiResult>
 </TestDostupnostiResponse>
 </s:Body>
</s:Envelope>
5.3 Volání DejMiCiselnik
Výstupy z číselníků jsou zkráceny
5.3.1 Státní příslušnosti
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header>
 <Action s:mustUnderstand="1"
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/DejMiCiselnik</Action>
 </s:Header>
 <s:Body>
 <DejMiCiselnik xmlns="http://UBY.pcr.cz/WS_UBY">
 <CoChci>Staty</CoChci>
 </DejMiCiselnik>
 </s:Body>
</s:Envelope>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 12/17
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <DejMiCiselnikResponse xmlns="http://UBY.pcr.cz/WS_UBY">
 <DejMiCiselnikResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY"
xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
 <a:CiselnikType>
 <a:Id>104</a:Id>
 <a:Kod2>AF</a:Kod2>
 <a:Kod3>AFG</a:Kod3>
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ>Afghánská islámská republika</a:TextCZ>
 <a:TextENG>Afghanistan</a:TextENG>
 <a:TextKratkyCZ>Afghánistán</a:TextKratkyCZ>
 <a:TextKratkyENG />
 </a:CiselnikType>
 ….

 <a:CiselnikType>
 <a:Id>241</a:Id>
 <a:Kod2>ZW</a:Kod2>
 <a:Kod3>ZWE</a:Kod3>
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ>Zimbabwská republika</a:TextCZ>
 <a:TextENG>Zimbabwe</a:TextENG>
 <a:TextKratkyCZ>Zimbabwe</a:TextKratkyCZ>
 <a:TextKratkyENG />
 </a:CiselnikType>
 </DejMiCiselnikResult>
 </DejMiCiselnikResponse>
 </s:Body>
</s:Envelope>
5.3.2 Chyby
Vrácené texty nejsou ve stejném uspořádání jako číselník států. Text je rozdělen do více položek. Při
zpracování je nutné vzít tuto anomálii na vědomí.
Červeně označené číslo znamená skutečné číslo chyby uvedené ve třídě chyby v položkách (bez
vodících nul) ChybyHlavicky a ChybyZaznamu viz výše:
 <a:ChybyHlavicky>5;6;7;8;9;10;11;12;13;</a:ChybyHlavicky>
 <a:ChybyZaznamu xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
 <b:string>;112;106;</b:string>
 </a:ChybyZaznamu>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 13/17
 <Action s:mustUnderstand="1"
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/DejMiCiselnik</Action>
 </s:Header>
 <s:Body>
 <DejMiCiselnik xmlns="http://UBY.pcr.cz/WS_UBY">
 <CoChci>Chyby</CoChci>
 </DejMiCiselnik>
 </s:Body>
</s:Envelope>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <DejMiCiselnikResponse xmlns="http://UBY.pcr.cz/WS_UBY">
 <DejMiCiselnikResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY"
xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
 <a:CiselnikType>
 <a:Id>0</a:Id>
 <a:Kod2>ERR_CZE_001</a:Kod2>
 <a:Kod3>Nekorektní koncovka souboru</a:Kod3>
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ />
 <a:TextENG>INFORMACE</a:TextENG>
 <a:TextKratkyCZ>0</a:TextKratkyCZ>
 <a:TextKratkyENG>O podezření z chyby je nutno informovat uživatele, procedura pracuje
dále</a:TextKratkyENG>
 </a:CiselnikType>
 ….
 <a:CiselnikType>
 <a:Id>0</a:Id>
 <a:Kod2>ERR_CZE_112</a:Kod2>
 <a:Kod3>Oznámeno pozdě</a:Kod3>
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ />
 <a:TextENG>INFORMACE</a:TextENG>
 <a:TextKratkyCZ>0</a:TextKratkyCZ>
 <a:TextKratkyENG>O podezření z chyby je nutno informovat uživatele, procedura pracuje
dále</a:TextKratkyENG>
 </a:CiselnikType>
 </DejMiCiselnikResult>
 </DejMiCiselnikResponse>
 </s:Body>
</s:Envelope>
5.3.3 Důvody pobytu
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 14/17
 <Action s:mustUnderstand="1"
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/DejMiCiselnik</Action>
 </s:Header>
 <s:Body>
 <DejMiCiselnik xmlns="http://UBY.pcr.cz/WS_UBY">
 <CoChci>UcelyPobytu</CoChci>
 </DejMiCiselnik>
 </s:Body>
</s:Envelope>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <DejMiCiselnikResponse xmlns="http://UBY.pcr.cz/WS_UBY">
 <DejMiCiselnikResult xmlns:a="http://schemas.datacontract.org/2004/07/WS_UBY"
xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
 <a:CiselnikType>
 <a:Id>0</a:Id>
 <a:Kod2>00</a:Kod2>
 <a:Kod3 />
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ>00 - ZDRAVOTNÍ</a:TextCZ>
 <a:TextENG />
 <a:TextKratkyCZ />
 <a:TextKratkyENG />
 </a:CiselnikType>
 …..
 <a:CiselnikType>
 <a:Id>0</a:Id>
 <a:Kod2>93</a:Kod2>
 <a:Kod3 />
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ>93 - TZV. ADS vízum udělované občanu Číny</a:TextCZ>
 <a:TextENG />
 <a:TextKratkyCZ />
 <a:TextKratkyENG />
 </a:CiselnikType>
 <a:CiselnikType>
 <a:Id>0</a:Id>
 <a:Kod2>99</a:Kod2>
 <a:Kod3 />
 <a:PlatiDo />
 <a:PlatiOd />
 <a:TextCZ>99 - OSTATNÍ / JINÉ</a:TextCZ>
 <a:TextENG />
 <a:TextKratkyCZ />
 <a:TextKratkyENG />
 </a:CiselnikType>
 </DejMiCiselnikResult>
 </DejMiCiselnikResponse>
 </s:Body>

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 15/17
</s:Envelope>
5.4 Volání MaxDelkaSeznamu
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header>
 <Action s:mustUnderstand="1"
xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">http://UBY.pcr.cz/WS_UBY/IWS
_UBY/MaximalniDelkaSeznamu</Action>
 </s:Header>
 <s:Body>
 <MaximalniDelkaSeznamu xmlns="http://UBY.pcr.cz/WS_UBY" />
 </s:Body>
</s:Envelope>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
 <s:Header />
 <s:Body>
 <MaximalniDelkaSeznamuResponse xmlns="http://UBY.pcr.cz/WS_UBY">
 <MaximalniDelkaSeznamuResult>32</MaximalniDelkaSeznamuResult>
 </MaximalniDelkaSeznamuResponse>
 </s:Body>
</s:Envelope>
32 – znamená, že v seznamu může být maximálně 32 záznamů o ubytovaných.
Tato hodnota je na straně serveru konfigurovatelná a může se v budoucnu měnit.

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 16/17
6. WSDL
WSDL služby je uvedeno v příloze nebo je možné jej stáhnout ze serveru, viz bod 2.1. V produkční
instalaci je služba dostupná na protokolu HTTPS. URL uvedené ve WSDL bude jiné a je nutné jej
v aplikaci nakonfigurovat.

Odbor informatiky a provozu informačních technologií | Příloha č. 5 k Provoznímu řádu Internetové aplikace Ubyport 17/17
7. Shrnutí
Tato služba je obálkou nad backendovou službou a umožňuje strojní zpracování na stejném
backgroundu, jako probíhá zpracování ve webové aplikaci.
Ze zkušeností z provozu doporučujeme:
- Nepřekládat názvy nodů SOAP, pokud je SOAP tělo vytvářeno jiným způsobem, než použitím
přístupových tříd.
- Dodržovat datové typy, tak jak jsou definovány ve WSDL.
Zpracoval:
OIPIT PP ČR
Jan Šich
Schválil:
OIPIT PP ČR
pplk. Ing. David Konvalina

## Source: ubyport_UNL_sample

A|2|123456789012|VODPO|Hotel Pošta|Jan Sibelius, tel: 261 197 135|Strakonice|Vodòany|Vodòany I|Alešova|26||38901|2015.12.06 04:31:26||
U|01.10.2015|02.10.2015|ABDALLA|FAZUL||25.02.1974|||XXX|Kábul, Kedale 21|321654|999|01||
U|01.10.2015|03.10.2015|ABDULLAH|MOHAMED||15.01.1977|||SYR|Damašek, Karelwerg 12 |987654|123|02||
U|01.10.2015|04.10.2015|AGOVIÈ|MOHAMED||13.06.1970|||SCG|Noar, Kill 32|753159|321|03||
U|01.10.2015|05.10.2015|ANDÌL|JAN||01.01.1950|||BLZ|Brudé|159753|888|04||
U|01.10.2015|06.10.2015|HOHOS|KOKO||00.00.1950|||AFG|Kábul, Salde 1234|123456|777|05||
U|01.10.2015|07.10.2015|SCHINDLER|BRUNO||00.00.2000|||DEU|Berlín, Vogel 45|159753|666|06||
