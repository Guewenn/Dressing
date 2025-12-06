import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  Modal, 
  ActivityIndicator, 
  StatusBar, 
  Platform, 
  Dimensions, 
  TextInput, 
  Alert,
  Animated, 
  Easing
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// --- CONFIGURATION ---
const REMOVE_BG_API_KEY = 'fxGgeL7K7mq8hV8Y6QpWKSTe'; 

const TYPES = ['Haut', 'Bas', 'Chaussures'];
const FILTERS_TYPE = ['Tout', ...TYPES]; 
const STYLES = ['Quotidien', 'Travail', 'Sport', 'Soirée', 'Maison', 'Rencard', 'Plage', 'Mariage'];
const FILTERS_STYLE = ['Tout', ...STYLES]; 

const FONT_TITLE = Platform.OS === 'ios' ? 'Didot' : 'serif';
const FONT_BODY = Platform.OS === 'ios' ? 'Avenir Next' : 'Roboto';

const COULEURS = [
    { id: 'Tout', hex: 'transparent', label: 'Tout' }, 
    { id: 'noir', hex: '#000000', label: 'Noir' },
    { id: 'blanc', hex: '#FFFFFF', label: 'Blanc' },
    { id: 'gris', hex: '#808080', label: 'Gris' },
    { id: 'beige', hex: '#F5F5DC', label: 'Beige' },
    { id: 'bleu', hex: '#0000FF', label: 'Bleu' },
    { id: 'rouge', hex: '#FF0000', label: 'Rouge' },
    { id: 'vert', hex: '#008000', label: 'Vert' },
    { id: 'jaune', hex: '#FFFF00', label: 'Jaune' },
    { id: 'rose', hex: '#FFC0CB', label: 'Rose' },
    { id: 'marron', hex: '#8B4513', label: 'Marron' },
    { id: 'orange', hex: '#FFA500', label: 'Orange' },
    { id: 'violet', hex: '#800080', label: 'Violet' },
];

const STORAGE_KEY = '@dressing_studio_v38_rescue';
const MANNEQUIN_URI = 'https://upload.wikimedia.org/wikipedia/commons/9/92/Female_model_outline.png';

const COLORS = {
  primary: '#111111',     
  secondary: '#F4F4F4',  
  white: '#FFFFFF',
  text: '#111111',
  grey: '#AAAAAA'
};

const { width } = Dimensions.get('window');


const FadeInView = (props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ ...props.style, opacity: fadeAnim }}>{props.children}</Animated.View>;
};

export default function App() {
  const [dressing, setDressing] = useState([]);
  const [looks, setLooks] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [processingImage, setProcessingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('studio');
  
  const [hautActuel, setHautActuel] = useState(null);
  const [basActuel, setBasActuel] = useState(null);
  const [chaussuresActuelles, setChaussuresActuelles] = useState(null);

  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState('Haut'); 
  const [filterType, setFilterType] = useState('Tout');
  const [filterStyle, setFilterStyle] = useState('Tout');
  const [filterColor, setFilterColor] = useState('Tout');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [imageBruteUri, setImageBruteUri] = useState(null);
  const [nouveauType, setNouveauType] = useState(TYPES[0]);
  const [nouveauStyle, setNouveauStyle] = useState(STYLES[0]);
  const [nouveauCouleur, setNouveauCouleur] = useState(COULEURS[1].id); 
  const [nouveauLabel, setNouveauLabel] = useState(''); 


  useEffect(() => { chargerDonnees(); }, []);
  useEffect(() => { if (!loading) sauvegarderDonnees(); }, [dressing, looks]);

  const chargerDonnees = async () => { 
    try { 
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY); 
      const looksValue = await AsyncStorage.getItem(STORAGE_KEY + '_looks');
      if (jsonValue != null) setDressing(JSON.parse(jsonValue)); 
      if (looksValue != null) setLooks(JSON.parse(looksValue)); 
      

      if (jsonValue === null) {
          const oldKey = '@dressing_studio_v37_stable_repair'; 
          const oldJson = await AsyncStorage.getItem(oldKey);
          if (oldJson != null) setDressing(JSON.parse(oldJson));

      }

    } catch (e) { console.error(e); } finally { setLoading(false); } 
  };
  
  const sauvegarderDonnees = async () => { 
    try { 
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dressing)); 
        await AsyncStorage.setItem(STORAGE_KEY + '_looks', JSON.stringify(looks)); 
    } catch (e) {} 
  };

  const removeBackground = async (imageUri) => {
    if (!REMOVE_BG_API_KEY) { Alert.alert("INFO", "Clé API manquante."); return imageUri; }
    try {
        setProcessingImage(true);
        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: { 'X-Api-Key': REMOVE_BG_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_file_b64: base64, size: 'preview', type: 'product', format: 'png' }),
        });
        if (!response.ok) throw new Error(`Erreur API`);
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.onload = () => { setProcessingImage(false); resolve(reader.result); };
            reader.onerror = () => { setProcessingImage(false); resolve(imageUri); };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        setProcessingImage(false);
        Alert.alert("INFO", "Détourage impossible. Image conservée.");
        return imageUri;
    }
  };

  const demanderSourceImage = () => {
      Alert.alert("NOUVELLE PIÈCE", "Sélectionnez la source", [
          { text: "APPAREIL PHOTO", onPress: lancerCamera },
          { text: "GALERIE PHOTO", onPress: ouvrirGalerie },
          { text: "ANNULER", style: "cancel" }
      ]);
  };

  const ouvrirGalerie = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.6 });
    if (!res.canceled) { setImageBruteUri(res.assets[0].uri); setAddModalVisible(true); }
  };

  const lancerCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
      if (!res.canceled) { setImageBruteUri(res.assets[0].uri); setAddModalVisible(true); }
  };

  const validerAjout = async (forceOriginal = false) => {
    if (!imageBruteUri) return;
    let imgFinal = forceOriginal ? imageBruteUri : await removeBackground(imageBruteUri);
    const item = { id: Date.now().toString(), uri: imgFinal, type: nouveauType, style: nouveauStyle, couleur: nouveauCouleur, label: nouveauLabel };
    setDressing(prev => [item, ...prev]); 
    fermerAddModal();
  };

  const fermerAddModal = () => { setAddModalVisible(false); setImageBruteUri(null); setNouveauType(TYPES[0]); setNouveauLabel(''); setNouveauCouleur('noir'); };
  
  const supprimerVetement = (id) => {
      Alert.alert("RETIRER", "Supprimer cet article définitivement ?", [
          { text: "NON" }, 
          { text: "OUI", style: 'destructive', onPress: () => {
              setDressing(dressing.filter(i => i.id !== id));
              if (hautActuel?.id === id) setHautActuel(null);
              if (basActuel?.id === id) setBasActuel(null);
              if (chaussuresActuelles?.id === id) setChaussuresActuelles(null);
          }}
      ]);
  };

  const ouvrirSelecteur = (type) => { 
      setSelectionType(type); setFilterType('Tout'); setFilterStyle('Tout'); setFilterColor('Tout'); setSelectionModalVisible(true); 
  };
  const choisirVetement = (item) => {
      if (item.type === 'Haut') setHautActuel(item);
      if (item.type === 'Bas') setBasActuel(item);
      if (item.type === 'Chaussures') setChaussuresActuelles(item);
      setSelectionModalVisible(false);
  };

  const genererTenueAleatoire = () => {
      const hauts = dressing.filter(i => i.type === 'Haut');
      const bas = dressing.filter(i => i.type === 'Bas');
      const shoes = dressing.filter(i => i.type === 'Chaussures');
      
      if (hauts.length === 0 && bas.length === 0) { Alert.alert("VIDE", "Ajoutez des vêtements d'abord."); return; }
      if (hauts.length > 0) setHautActuel(hauts[Math.floor(Math.random() * hauts.length)]);
      if (bas.length > 0) setBasActuel(bas[Math.floor(Math.random() * bas.length)]);
      if (shoes.length > 0) setChaussuresActuelles(shoes[Math.floor(Math.random() * shoes.length)]);
  };

  const sauvegarderLook = () => {
      if (!hautActuel && !basActuel && !chaussuresActuelles) {
          Alert.alert("VIDE", "Habillez le mannequin avant de sauvegarder.");
          return;
      }
      const newLook = {
          id: Date.now().toString(),
          haut: hautActuel,
          bas: basActuel,
          chaussures: chaussuresActuelles,
          date: new Date().toLocaleDateString()
      };
      setLooks(prev => [newLook, ...prev]);
      Alert.alert("ENREGISTRÉ", "Tenue ajoutée au Lookbook.");
  };

  const supprimerLook = (id) => {
      Alert.alert("SUPPRIMER", "Retirer ce look ?", [
          { text: "NON" }, { text: "OUI", style: 'destructive', onPress: () => setLooks(looks.filter(l => l.id !== id)) }
      ]);
  };

  const getFilteredItems = (isSelectionMode = false, forcedType = null) => {
      return dressing.filter(item => {
          let matchType = true;
          if (isSelectionMode) matchType = item.type === forcedType;
          else matchType = filterType === 'Tout' || item.type === filterType;
          const matchStyle = filterStyle === 'Tout' || item.style === filterStyle;
          const matchColor = filterColor === 'Tout' || item.couleur === filterColor;
          return matchType && matchStyle && matchColor;
      });
  };

  const renderStudio = () => {
    return (
        <FadeInView style={styles.studioContainer}>
            <View style={styles.mannequinZone}>
                <View style={styles.mannequinStage}>
                    {/* Filigrane ST */}
                    <Text style={styles.bgTextST}>St</Text>

                    <Image source={{ uri: MANNEQUIN_URI }} style={styles.baseBody} resizeMode="contain" />
                    
                    {/* BAS : resizeMode="cover" pour bien remplir les jambes, mais zone calibrée */}
                    <View style={[styles.clothingLayer, styles.layerBottom]}>
                       {basActuel && <Image source={{ uri: basActuel.uri }} style={styles.clothingImage} resizeMode="contain" />}
                    </View>
                    
                    {/* HAUT */}
                    <View style={[styles.clothingLayer, styles.layerTop]}>
                        {hautActuel && <Image source={{ uri: hautActuel.uri }} style={styles.clothingImage} resizeMode="contain" />}
                    </View>

                    {/* CHAUSSURES : Zone LARGE pour bien voir */}
                    <View style={[styles.clothingLayer, styles.layerShoes]}>
                        {chaussuresActuelles && <Image source={{ uri: chaussuresActuelles.uri }} style={styles.clothingImage} resizeMode="contain" />}
                    </View>
                </View>
            </View>

            <View style={styles.controlsZone}>
                <View style={styles.controlsHeader}>
                    <TouchableOpacity style={styles.actionBtnSmall} onPress={genererTenueAleatoire}>
                        <Text style={styles.actionBtnText}>ALÉATOIRE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtnSmall, {backgroundColor: COLORS.primary}]} onPress={sauvegarderLook}>
                        <Text style={[styles.actionBtnText, {color:'white'}]}>SAUVEGARDER</Text>
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={{maxHeight: 250}} showsVerticalScrollIndicator={false}>
                    <View style={styles.controlRow}>
                        <TouchableOpacity style={[styles.bigButton, styles.btnBorder]} onPress={() => ouvrirSelecteur('Haut')}>
                            <View><Text style={styles.bigButtonText}>HAUT</Text><Text style={styles.bigButtonSub}>{hautActuel ? hautActuel.style : 'Sélectionner'}</Text></View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                        {hautActuel && <TouchableOpacity style={styles.removeBtn} onPress={() => setHautActuel(null)}><Text style={styles.removeIcon}>✕</Text></TouchableOpacity>}
                    </View>

                    <View style={styles.controlRow}>
                        <TouchableOpacity style={[styles.bigButton, styles.btnBorder]} onPress={() => ouvrirSelecteur('Bas')}>
                            <View><Text style={styles.bigButtonText}>BAS</Text><Text style={styles.bigButtonSub}>{basActuel ? basActuel.style : 'Sélectionner'}</Text></View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                        {basActuel && <TouchableOpacity style={styles.removeBtn} onPress={() => setBasActuel(null)}><Text style={styles.removeIcon}>✕</Text></TouchableOpacity>}
                    </View>

                    <View style={styles.controlRow}>
                        <TouchableOpacity style={[styles.bigButton, styles.btnBorder]} onPress={() => ouvrirSelecteur('Chaussures')}>
                            <View><Text style={styles.bigButtonText}>CHAUSSURES</Text><Text style={styles.bigButtonSub}>{chaussuresActuelles ? chaussuresActuelles.style : 'Sélectionner'}</Text></View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                        {chaussuresActuelles && <TouchableOpacity style={styles.removeBtn} onPress={() => setChaussuresActuelles(null)}><Text style={styles.removeIcon}>✕</Text></TouchableOpacity>}
                    </View>
                </ScrollView>
            </View>
        </FadeInView>
    );
  };

  const renderLookbook = () => (
      <ScrollView style={styles.gridContainer}>
          <Text style={styles.pageTitle}>LOOKBOOK</Text>
          {looks.length === 0 ? <Text style={styles.emptyText}>Aucun look.</Text> : looks.map((look) => (
              <View key={look.id} style={styles.lookItem}>
                  <View style={styles.lookDateRow}>
                      <Text style={styles.lookDate}>{look.date}</Text>
                      <TouchableOpacity onPress={() => supprimerLook(look.id)}><Text style={styles.deleteText}>SUPPRIMER</Text></TouchableOpacity>
                  </View>
                  <View style={styles.lookImagesRow}>
                      {look.haut ? <Image source={{ uri: look.haut.uri }} style={styles.lookThumb} /> : <View style={styles.lookThumbEmpty} />}
                      {look.bas ? <Image source={{ uri: look.bas.uri }} style={styles.lookThumb} /> : <View style={styles.lookThumbEmpty} />}
                      {look.chaussures ? <Image source={{ uri: look.chaussures.uri }} style={styles.lookThumb} /> : <View style={styles.lookThumbEmpty} />}
                  </View>
              </View>
          ))}
          <View style={{ height: 100 }} />
      </ScrollView>
  );

  const renderGalleryGrid = (items, onSelect = null, allowDelete = false) => (
    <ScrollView style={styles.gridContainer}>
        <View style={styles.grid}>
            {items.length === 0 ? <Text style={styles.emptyText}>Aucune pièce.</Text> : items.map(item => (
                <TouchableOpacity 
                    key={item.id} 
                    style={styles.gridItem} 
                    onPress={() => onSelect ? onSelect(item) : null} 
                    onLongPress={() => allowDelete ? supprimerVetement(item.id) : null}
                >
                    <View style={styles.gridImageContainer}>
                        <Image source={{ uri: item.uri }} style={styles.gridImage} resizeMode="contain" />
                    </View>
                    <View style={styles.gridInfoContainer}>
                        <View style={{flexDirection:'row', alignItems:'center', justifyContent: 'center', marginBottom: 2}}>
                            <View style={[styles.colorDotSmall, {backgroundColor: COULEURS.find(c=>c.id===item.couleur)?.hex || '#CCC'}]} />
                            <Text style={styles.gridLabel} numberOfLines={1}>{item.style}</Text>
                        </View>
                        {item.label ? <Text style={styles.gridNote} numberOfLines={1}>{item.label}</Text> : null}
                    </View>
                </TouchableOpacity>
            ))}
        </View>
        <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderFilters = (showTypeFilter = true) => (
    <View style={styles.filterContainer}>
        {showTypeFilter && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {FILTERS_TYPE.map(type => (
                    <TouchableOpacity key={type} onPress={() => setFilterType(type)} style={[styles.filterChip, filterType === type && styles.filterChipActive, {borderColor: COLORS.primary}]}>
                        <Text style={[styles.filterText, filterType === type && styles.filterTextActive, {fontWeight:'700'}]}>{type.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginTop: showTypeFilter ? 10 : 0 }]}>
            {FILTERS_STYLE.map(style => (
                <TouchableOpacity key={style} onPress={() => setFilterStyle(style)} style={[styles.filterChip, filterStyle === style && styles.filterChipActive]}>
                    <Text style={[styles.filterText, filterStyle === style && styles.filterTextActive]}>{style}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
        <View style={{ height: 50, justifyContent: 'center', marginTop: 5 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 20, flexGrow: 1, justifyContent: 'center' }}>
                {COULEURS.map(col => (
                    <TouchableOpacity key={col.id} onPress={() => setFilterColor(col.id)} style={[col.id === 'Tout' ? styles.pillTout : styles.colorFilterDot, filterColor === col.id && styles.colorFilterDotActive, col.id !== 'Tout' && { backgroundColor: col.hex }, col.id === 'blanc' && { borderWidth: 1, borderColor: '#DDD' }]}>
                        {col.id === 'Tout' && <Text style={{fontSize:11, color: filterColor === 'Tout' ? 'white' : '#333', fontWeight:'600'}}>TOUS</Text>}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 40 : 60 }]}>
        <Text style={styles.headerTitle}>STUDIO</Text>
        <TouchableOpacity style={styles.btnAdd} onPress={demanderSourceImage}><Text style={styles.btnAddText}>+</Text></TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'studio' && renderStudio()}
        {activeTab === 'dressing' && (
            <FadeInView style={{ flex: 1 }}>
                {renderFilters(true)} 
                {renderGalleryGrid(getFilteredItems(false), null, true)}
            </FadeInView>
        )}
        {activeTab === 'lookbook' && (
            <FadeInView style={{ flex: 1 }}>
                {renderLookbook()}
            </FadeInView>
        )}
      </View>

      <View style={[styles.tabBarContainer, Platform.OS === 'android' && { paddingBottom: 35, height: 90 }]}>
          <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('studio')}>
              <Text style={[styles.tabLabel, activeTab === 'studio' && styles.tabLabelActive]}>STUDIO</Text>
              {activeTab === 'studio' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('dressing')}>
              <Text style={[styles.tabLabel, activeTab === 'dressing' && styles.tabLabelActive]}>DRESSING</Text>
              {activeTab === 'dressing' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('lookbook')}>
              <Text style={[styles.tabLabel, activeTab === 'lookbook' && styles.tabLabelActive]}>LOOKBOOK</Text>
              {activeTab === 'lookbook' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
      </View>

      <Modal animationType="slide" visible={selectionModalVisible} presentationStyle="pageSheet">
          <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
              <View style={styles.modalFullContainer}>
                  <View style={styles.modalHeaderBasic}>
                      <Text style={styles.modalTitle}>SÉLECTION {selectionType.toUpperCase()}</Text>
                      <TouchableOpacity onPress={() => setSelectionModalVisible(false)} style={{padding: 10}}>
                          <Text style={styles.closeText}>FERMER</Text>
                      </TouchableOpacity>
                  </View>
                  {renderFilters(false)}
                  {renderGalleryGrid(getFilteredItems(true, selectionType), choisirVetement, false)}
              </View>
          </SafeAreaView>
      </Modal>

      <Modal animationType="fade" visible={addModalVisible || processingImage} transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{flex:1}} activeOpacity={1} onPress={fermerAddModal}>
            <View style={{flex:1, justifyContent: 'center', padding: 20}}>
                <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
                    {processingImage ? <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>TRAITEMENT...</Text></View> : (
                        <ScrollView contentContainerStyle={styles.modalScroll}>
                            <Text style={styles.modalTitle}>NOUVEL ARTICLE</Text>
                            {imageBruteUri && <Image source={{ uri: imageBruteUri }} style={styles.previewImg} />}
                            <Text style={styles.sectionTitle}>TYPE</Text>
                            <View style={styles.pillsRow}>{TYPES.map(t => (<TouchableOpacity key={t} onPress={() => setNouveauType(t)} style={[styles.pill, nouveauType === t && styles.pillActive]}><Text style={[styles.pillText, nouveauType === t && styles.pillTextActive]}>{t}</Text></TouchableOpacity>))}</View>
                            <Text style={styles.sectionTitle}>STYLE</Text>
                            <View style={styles.pillsRow}>{STYLES.map(s => (<TouchableOpacity key={s} onPress={() => setNouveauStyle(s)} style={[styles.pill, nouveauStyle === s && styles.pillActive]}><Text style={[styles.pillText, nouveauStyle === s && styles.pillTextActive]}>{s}</Text></TouchableOpacity>))}</View>
                            <Text style={styles.sectionTitle}>COULEUR</Text>
                            <View style={[styles.pillsRow, { justifyContent: 'flex-start' }]}>
                                {COULEURS.filter(c => c.id !== 'Tout').map(c => (
                                    <TouchableOpacity key={c.id} onPress={() => setNouveauCouleur(c.id)} style={[styles.colorOption, { backgroundColor: c.hex }, nouveauCouleur === c.id && styles.colorOptionActive, (c.id === 'blanc') && {borderWidth:1, borderColor:'#EEE'}]} />
                                ))}
                            </View>
                            <TextInput style={styles.input} placeholder="Note perso (ex: Zara, Taille M)..." value={nouveauLabel} onChangeText={setNouveauLabel} />
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={fermerAddModal}><Text style={{color: 'gray'}}>ANNULER</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.btnValidate} onPress={() => validerAjout(false)}><Text style={styles.btnValidateText}>ENREGISTRER</Text></TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: COLORS.white, zIndex: 10 },
  headerTitle: { fontSize: 24, fontFamily: FONT_TITLE, fontWeight: '600', letterSpacing: 4, color: COLORS.primary },
  btnAdd: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  btnAddText: { color: 'white', fontSize: 18, marginTop: -2 },
  content: { flex: 1 },

  // --- STUDIO ---
  studioContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  mannequinZone: { flex: 2, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
  mannequinStage: { width: width * 0.9, height: '100%', position: 'relative', alignItems: 'center' },

  bgTextST: {
      position: 'absolute', top: '20%', width: '100%', textAlign: 'center',
      fontFamily: FONT_TITLE, fontSize: 250, fontWeight: 'bold',
      color: '#111111', opacity: 0.06, zIndex: 1, fontStyle: 'italic',
  },
  
  baseBody: { width: '100%', height: '100%', opacity: 0.8, zIndex: 10 }, 
  
  clothingLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  
  layerTop: { 
      top: '26%', 
      height: '32%', 
      width: '65%', 
      zIndex: 30 
  }, 
  layerBottom: { 
      top: '52%', 
      height: '45%', 
      width: '45%', 
      zIndex: 20 
  }, 
  layerShoes: { 
      top: '90%', 
      height: '18%', 
      width: '40%', 
      zIndex: 40 
  }, 
  
  clothingImage: { width: '100%', height: '100%' },

  controlsZone: { flex: 1, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 25 },
  controlsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  controlsTitle: { fontSize: 14, fontFamily: FONT_TITLE, fontWeight: '600', color: '#333', textTransform: 'uppercase', letterSpacing: 3 },
  actionBtnSmall: { backgroundColor: '#F5F5F5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 0, borderWidth: 1, borderColor: '#EEE' },
  actionBtnText: { fontSize: 10, fontWeight: '600', color: '#333', letterSpacing: 1, fontFamily: FONT_BODY },

  controlRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  bigButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 0, backgroundColor: '#FAFAFA' },
  btnBorder: { borderLeftWidth: 2, borderLeftColor: '#333' },
  bigButtonText: { fontSize: 13, fontWeight: '600', color: '#333', letterSpacing: 1, fontFamily: FONT_BODY },
  bigButtonSub: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: FONT_BODY },
  chevron: { fontSize: 18, color: '#CCC' },
  removeBtn: { marginLeft: 10, padding: 10 },
  removeIcon: { color: '#AAA', fontSize: 14 },

  filterContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#FAFAFA', paddingBottom: 5, paddingTop: 10 },
  filterScroll: { alignItems: 'center', paddingHorizontal: 15 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 0, backgroundColor: 'transparent', marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
  filterChipActive: { backgroundColor: '#333', borderColor: '#333' },
  filterText: { fontSize: 11, color: '#666', fontWeight: '500', letterSpacing: 1, fontFamily: FONT_BODY, textTransform: 'uppercase' },
  filterTextActive: { color: 'white' },
  colorFilterDot: { width: 24, height: 24, borderRadius: 12, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  colorFilterDotActive: { borderWidth: 2, borderColor: '#333', transform: [{scale: 1.1}] },
  pillTout: { paddingHorizontal: 12, height: 24, borderRadius: 12, marginRight: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#EEE' },

  gridContainer: { flex: 1, backgroundColor: 'white', paddingTop: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  gridItem: { width: '48%', marginBottom: 15, marginHorizontal: '1%' },
  gridImageContainer: { height: 180, width: '100%', backgroundColor: '#FAFAFA', borderRadius: 0, marginBottom: 8, justifyContent: 'center', alignItems: 'center' },
  gridImage: { width: '100%', height: '100%' },
  gridInfoContainer: { alignItems: 'center', paddingBottom: 5 },
  gridLabel: { fontSize: 10, fontWeight: '500', color: '#333', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONT_BODY },
  gridNote: { fontSize: 10, fontStyle: 'italic', color: '#888', marginTop: 3, fontFamily: FONT_BODY, textAlign: 'center' },
  colorDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 4, borderWidth: 0.5, borderColor: '#DDD' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontFamily: FONT_BODY },
  
  pageTitle: { fontSize: 16, fontFamily: FONT_TITLE, textAlign: 'center', marginVertical: 20, letterSpacing: 2 },
  lookItem: { marginHorizontal: 20, marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 20 },
  lookDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  lookDate: { fontSize: 12, color: '#888', fontFamily: FONT_BODY },
  deleteText: { fontSize: 10, color: '#FF3B30', fontWeight: '700' },
  lookImagesRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  lookThumb: { width: 80, height: 100, backgroundColor: '#F9F9F9', resizeMode: 'contain' },
  lookThumbEmpty: { width: 80, height: 100, backgroundColor: '#F5F5F5' },

  tabBarContainer: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  tabBar: { flexDirection: 'row', height: 60, alignItems: 'center' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#CCC', letterSpacing: 2, fontFamily: FONT_BODY },
  tabLabelActive: { color: COLORS.primary, fontWeight: '800' },
  activeTabIndicator: { position: 'absolute', top: 0, width: 40, height: 2, backgroundColor: COLORS.primary },

  modalFullContainer: { flex: 1, backgroundColor: 'white' },
  modalHeaderBasic: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 16, fontFamily: FONT_TITLE, letterSpacing: 2, fontWeight: '600' },
  closeText: { color: COLORS.primary, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalCard: { backgroundColor: 'white', width: '100%', height: '90%', borderRadius: 0, overflow: 'hidden' },
  modalScroll: { padding: 25 },
  previewImg: { width: 120, height: 120, alignSelf: 'center', marginBottom: 20, backgroundColor: '#F9F9F9' },
  sectionTitle: { fontSize: 12, fontFamily: FONT_TITLE, fontWeight: '600', color: '#111', marginBottom: 10, marginTop: 15, letterSpacing: 2, textAlign: 'center' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  pill: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE', marginRight: 8, marginBottom: 8, borderRadius: 0 },
  pillActive: { backgroundColor: '#333', borderColor: '#333' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#333', fontFamily: FONT_BODY, letterSpacing: 0.5 },
  pillTextActive: { color: 'white' },
  colorOption: { width: 36, height: 36, borderRadius: 18, marginRight: 12, marginBottom: 10 },
  colorOptionActive: { borderWidth: 3, borderColor: '#333', transform: [{scale: 1.1}] },
  input: { backgroundColor: '#FAFAFA', padding: 15, borderRadius: 0, marginBottom: 20, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', marginTop: 15, fontFamily: FONT_BODY },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 20, marginBottom: 40 },
  btnValidate: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 0 },
  btnValidateText: { color: 'white', fontWeight: '600', letterSpacing: 2, fontSize: 12 },
  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 },
  loadingText: { marginTop: 20, fontWeight: '600', color: COLORS.primary, letterSpacing: 1 }
});