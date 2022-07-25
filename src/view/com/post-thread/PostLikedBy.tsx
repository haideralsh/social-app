import React, {useState, useEffect} from 'react'
import {observer} from 'mobx-react-lite'
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {OnNavigateContent} from '../../routes/types'
import {
  LikedByViewModel,
  LikedByViewItemModel,
} from '../../../state/models/liked-by-view'
import {useStores} from '../../../state'
import {s} from '../../lib/styles'
import {AVIS} from '../../lib/assets'

export const PostLikedBy = observer(function PostLikedBy({
  uri,
  onNavigateContent,
}: {
  uri: string
  onNavigateContent: OnNavigateContent
}) {
  const store = useStores()
  const [view, setView] = useState<LikedByViewModel | undefined>()

  useEffect(() => {
    if (view?.params.uri === uri) {
      console.log('Liked by doing nothing')
      return // no change needed? or trigger refresh?
    }
    console.log('Fetching Liked by', uri)
    const newView = new LikedByViewModel(store, {uri})
    setView(newView)
    newView.setup().catch(err => console.error('Failed to fetch liked by', err))
  }, [uri, view?.params.uri, store])

  // loading
  // =
  if (
    !view ||
    (view.isLoading && !view.isRefreshing) ||
    view.params.uri !== uri
  ) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    )
  }

  // error
  // =
  if (view.hasError) {
    return (
      <View>
        <Text>{view.error}</Text>
      </View>
    )
  }

  // loaded
  // =
  const renderItem = ({item}: {item: LikedByViewItemModel}) => (
    <LikedByItem item={item} onNavigateContent={onNavigateContent} />
  )
  return (
    <View>
      <FlatList
        data={view.likedBy}
        keyExtractor={item => item._reactKey}
        renderItem={renderItem}
      />
    </View>
  )
})

const LikedByItem = ({
  item,
  onNavigateContent,
}: {
  item: LikedByViewItemModel
  onNavigateContent: OnNavigateContent
}) => {
  const onPressOuter = () => {
    onNavigateContent('Profile', {
      name: item.name,
    })
  }
  return (
    <TouchableOpacity style={styles.outer} onPress={onPressOuter}>
      <View style={styles.layout}>
        <View style={styles.layoutAvi}>
          <Image
            style={styles.avi}
            source={AVIS[item.name] || AVIS['alice.com']}
          />
        </View>
        <View style={styles.layoutContent}>
          <Text style={[s.f15, s.bold]}>{item.displayName}</Text>
          <Text style={[s.f14, s.gray]}>@{item.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  outer: {
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  layout: {
    flexDirection: 'row',
  },
  layoutAvi: {
    width: 60,
    paddingLeft: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  avi: {
    width: 40,
    height: 40,
    borderRadius: 30,
    resizeMode: 'cover',
  },
  layoutContent: {
    flex: 1,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
})