import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      
      // In a real app we'd POST this to our Next.js API route that calls Gemini Vision
      console.log("Photo captured, sending to AI...");
      
      // Simulate API delay
      setTimeout(() => {
        setIsProcessing(false);
        // router.push({ pathname: '/explanation', params: { explanation: "AI Explanation here" } });
        router.back();
      }, 1500);
      
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} facing='back' style={styles.camera}>
        <View style={styles.overlay}>
          {isProcessing ? (
             <Text style={styles.processingText}>Analyzing with AI...</Text>
          ) : (
             <TouchableOpacity onPress={capture} style={styles.captureBtn}>
               <View style={styles.captureInner} />
             </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 40,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#5B2D8E',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  }
});
